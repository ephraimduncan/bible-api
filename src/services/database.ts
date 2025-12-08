import { Database } from "bun:sqlite";
import { join } from "node:path";

const DB_PATH = join(import.meta.dir, "../../bible.db");

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();

  // Create translations table
  database.run(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT,
      filename TEXT
    )
  `);
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language)"
  );

  // Create verses table
  database.run(`
    CREATE TABLE IF NOT EXISTS verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id TEXT NOT NULL,
      book INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (translation_id) REFERENCES translations(id),
      UNIQUE(translation_id, book, chapter, verse)
    )
  `);
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(translation_id, book, chapter, verse)"
  );
  database.run(
    "CREATE INDEX IF NOT EXISTS idx_verses_book_chapter ON verses(book, chapter)"
  );

  // Check if FTS table exists
  const ftsExists = database
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='verses_fts'"
    )
    .get();

  if (!ftsExists) {
    // Create FTS table
    database.run(`
      CREATE VIRTUAL TABLE verses_fts USING fts5(
        text,
        content='verses',
        content_rowid='id'
      )
    `);

    // Create trigger for FTS sync
    database.run(`
      CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
        INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
      END
    `);
  }
}

// Prepared statements (lazy initialized)
let stmts: {
  getTranslations?: ReturnType<Database["query"]>;
  getTranslationsByLanguage?: ReturnType<Database["query"]>;
  getTranslation?: ReturnType<Database["query"]>;
  getVerse?: ReturnType<Database["query"]>;
  getVerseRange?: ReturnType<Database["query"]>;
  getChapterVerses?: ReturnType<Database["query"]>;
  getChapterCount?: ReturnType<Database["query"]>;
} = {};

function getStatements() {
  const database = getDatabase();

  if (!stmts.getTranslations) {
    stmts.getTranslations = database.query(`
      SELECT id, name, language, status, filename FROM translations ORDER BY language, name
    `);
  }
  if (!stmts.getTranslationsByLanguage) {
    stmts.getTranslationsByLanguage = database.query(`
      SELECT id, name, language, status, filename FROM translations WHERE language = ? ORDER BY name
    `);
  }
  if (!stmts.getTranslation) {
    stmts.getTranslation = database.query(`
      SELECT id, name, language, status, filename FROM translations WHERE id = ?
    `);
  }
  if (!stmts.getVerse) {
    stmts.getVerse = database.query(`
      SELECT verse, text FROM verses
      WHERE translation_id = ? AND book = ? AND chapter = ? AND verse = ?
    `);
  }
  if (!stmts.getVerseRange) {
    stmts.getVerseRange = database.query(`
      SELECT verse, text FROM verses
      WHERE translation_id = ? AND book = ? AND chapter = ? AND verse BETWEEN ? AND ?
      ORDER BY verse
    `);
  }
  if (!stmts.getChapterVerses) {
    stmts.getChapterVerses = database.query(`
      SELECT verse, text FROM verses
      WHERE translation_id = ? AND book = ? AND chapter = ?
      ORDER BY verse
    `);
  }
  if (!stmts.getChapterCount) {
    stmts.getChapterCount = database.query(`
      SELECT chapter, COUNT(*) as verse_count FROM verses
      WHERE translation_id = ? AND book = ?
      GROUP BY chapter ORDER BY chapter
    `);
  }
  // searchVerses and searchCount are not prepared statements
  // because LIKE patterns are dynamic

  return stmts;
}

import type {
  TranslationRow,
  VerseRow,
  ChapterCountRow,
  SearchRow,
} from "../schemas";

export type { TranslationRow, VerseRow, ChapterCountRow, SearchRow };

// Query functions
export function getAllTranslations(): TranslationRow[] {
  return getStatements().getTranslations!.all() as TranslationRow[];
}

export function getTranslationsByLanguage(language: string): TranslationRow[] {
  return getStatements().getTranslationsByLanguage!.all(
    language
  ) as TranslationRow[];
}

export function getTranslationById(id: string): TranslationRow | null {
  return (getStatements().getTranslation!.get(id) as TranslationRow) || null;
}

export function getVerse(
  translationId: string,
  book: number,
  chapter: number,
  verse: number
): VerseRow | null {
  return (
    (getStatements().getVerse!.get(
      translationId,
      book,
      chapter,
      verse
    ) as VerseRow) || null
  );
}

export function getVerseRange(
  translationId: string,
  book: number,
  chapter: number,
  startVerse: number,
  endVerse: number
): VerseRow[] {
  return getStatements().getVerseRange!.all(
    translationId,
    book,
    chapter,
    startVerse,
    endVerse
  ) as VerseRow[];
}

export function getChapterVerses(
  translationId: string,
  book: number,
  chapter: number
): VerseRow[] {
  return getStatements().getChapterVerses!.all(
    translationId,
    book,
    chapter
  ) as VerseRow[];
}

export function getChapterCounts(
  translationId: string,
  book: number
): ChapterCountRow[] {
  return getStatements().getChapterCount!.all(
    translationId,
    book
  ) as ChapterCountRow[];
}

export function searchVerses(
  translationId: string,
  query: string,
  limit: number,
  offset: number
): { results: SearchRow[]; total: number } {
  // Handle empty or whitespace-only queries
  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], total: 0 };
  }

  const database = getDatabase();

  // Use LIKE for substring matching (supports partial words and phrases)
  const pattern = `%${trimmed}%`;

  const results = database
    .query(
      `SELECT book, chapter, verse, text FROM verses
       WHERE translation_id = ? AND text LIKE ?
       LIMIT ? OFFSET ?`
    )
    .all(translationId, pattern, limit, offset) as SearchRow[];

  const countResult = database
    .query(
      `SELECT COUNT(*) as total FROM verses
       WHERE translation_id = ? AND text LIKE ?`
    )
    .get(translationId, pattern) as { total: number };

  return { results, total: countResult?.total || 0 };
}

export function getAvailableLanguages(): string[] {
  const database = getDatabase();
  const rows = database
    .query("SELECT DISTINCT language FROM translations ORDER BY language")
    .all() as { language: string }[];
  return rows.map((r) => r.language);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    stmts = {};
  }
}
