import { Database } from "bun:sqlite";
import { XMLParser } from "fast-xml-parser";
import { readdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

const BIBLE_DIR = join(import.meta.dir, "../bible");
const DB_PATH = join(import.meta.dir, "../bible.db");

interface XmlVerse {
  "@_number": string;
  "#text": string;
}

interface XmlChapter {
  "@_number": string;
  verse: XmlVerse | XmlVerse[];
}

interface XmlBook {
  "@_number": string;
  chapter: XmlChapter | XmlChapter[];
}

interface XmlTestament {
  "@_name": string;
  book: XmlBook | XmlBook[];
}

interface XmlBible {
  "@_translation"?: string;
  "@_name"?: string;
  "@_status"?: string;
  "@_link"?: string;
  testament: XmlTestament | XmlTestament[];
}

interface XmlRoot {
  bible: XmlBible;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function parseLanguageFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.startsWith("english")) return "en";
  if (lower.startsWith("french")) return "fr";
  if (lower.startsWith("spanish")) return "es";
  if (lower.startsWith("german")) return "de";
  if (lower.startsWith("portuguese")) return "pt";
  if (lower.startsWith("chinese")) return "zh";
  return "en";
}

function parseTranslationIdFromFilename(filename: string): string {
  const baseName = filename.replace(".xml", "").replace("Bible", "");
  const language = parseLanguageFromFilename(filename);

  let abbr = "";

  if (baseName.startsWith("English")) {
    abbr = baseName.replace("English", "").toLowerCase();
    if (abbr === "kj") abbr = "kjv";
    if (abbr === "amplifiedclassic") abbr = "ampc";
    if (abbr === "amplified") abbr = "amp";
    if (abbr === "nkj") abbr = "nkjv";
    if (abbr === "nasu") abbr = "nasb95";
    if (abbr === "") abbr = "kjv";
  } else if (baseName.startsWith("French")) {
    abbr = baseName.replace("French", "").toLowerCase();
    if (abbr === "") abbr = "lsg";
    if (abbr === "2004") abbr = "lsg2004";
    if (abbr === "nbs") abbr = "nbs";
  } else {
    abbr = baseName.toLowerCase();
  }

  return `${language}-${abbr || "default"}`;
}

function initializeDatabase(db: Database): void {
  // Create translations table
  db.run(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT,
      filename TEXT
    )
  `);
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language)"
  );

  // Create verses table
  db.run(`
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
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(translation_id, book, chapter, verse)"
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_verses_book_chapter ON verses(book, chapter)"
  );
}

function createFtsTable(db: Database): void {
  // Drop existing FTS table if it exists
  db.run("DROP TABLE IF EXISTS verses_fts");

  // Create FTS table
  db.run(`
    CREATE VIRTUAL TABLE verses_fts USING fts5(
      text,
      content='verses',
      content_rowid='id'
    )
  `);

  // Populate FTS from verses
  console.log("Building full-text search index...");
  db.run("INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses");

  // Create trigger for future inserts
  db.run("DROP TRIGGER IF EXISTS verses_ai");
  db.run(`
    CREATE TRIGGER verses_ai AFTER INSERT ON verses BEGIN
      INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
    END
  `);
}

async function importXmlFile(
  db: Database,
  filepath: string,
  filename: string
): Promise<{ verses: number; skipped: boolean }> {
  const translationId = parseTranslationIdFromFilename(filename);

  // Check if translation already exists
  const existing = db
    .query("SELECT id FROM translations WHERE id = ?")
    .get(translationId);
  if (existing) {
    return { verses: 0, skipped: true };
  }

  const content = await readFile(filepath, "utf-8");
  const parsed = parser.parse(content) as XmlRoot;
  const bible = parsed.bible;

  const name =
    bible["@_translation"] || bible["@_name"] || filename.replace(".xml", "");
  const status = bible["@_status"] || "Unknown";
  const language = parseLanguageFromFilename(filename);

  // Insert translation
  db.run(
    "INSERT INTO translations (id, name, language, status, filename) VALUES (?, ?, ?, ?, ?)",
    [translationId, name, language, status, filename]
  );

  // Prepare verse insert
  const insertVerse = db.prepare(
    "INSERT INTO verses (translation_id, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)"
  );

  let verseCount = 0;
  const testaments = Array.isArray(bible.testament)
    ? bible.testament
    : [bible.testament];

  // Use transaction for bulk insert
  const insertAll = db.transaction(() => {
    for (const testament of testaments) {
      if (!testament?.book) continue;

      const books = Array.isArray(testament.book)
        ? testament.book
        : [testament.book];

      for (const book of books) {
        const bookNum = parseInt(book["@_number"], 10);
        if (!book.chapter) continue;

        const chapters = Array.isArray(book.chapter)
          ? book.chapter
          : [book.chapter];

        for (const chapter of chapters) {
          const chapterNum = parseInt(chapter["@_number"], 10);
          if (!chapter.verse) continue;

          const verses = Array.isArray(chapter.verse)
            ? chapter.verse
            : [chapter.verse];

          for (const verse of verses) {
            const verseNum = parseInt(verse["@_number"], 10);
            const text = verse["#text"] || "";

            insertVerse.run(translationId, bookNum, chapterNum, verseNum, text);
            verseCount++;
          }
        }
      }
    }
  });

  insertAll();

  return { verses: verseCount, skipped: false };
}

async function main() {
  console.log("Bible XML to SQLite Import\n");

  // Open database
  const db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = OFF"); // Faster for bulk import
  db.run("PRAGMA cache_size = -64000"); // 64MB cache

  // Initialize schema
  console.log("Initializing database schema...");
  initializeDatabase(db);

  // Find XML files
  let files: string[];
  try {
    files = (await readdir(BIBLE_DIR)).filter((f) => f.endsWith(".xml"));
  } catch {
    console.log("No bible/ directory found. Nothing to import.");
    db.close();
    return;
  }

  if (files.length === 0) {
    console.log("No XML files found in bible/ directory.");
    db.close();
    return;
  }

  console.log(`Found ${files.length} XML file(s)\n`);

  let imported = 0;
  let skipped = 0;
  let totalVerses = 0;
  const filesToDelete: string[] = [];

  for (const filename of files) {
    const filepath = join(BIBLE_DIR, filename);
    process.stdout.write(`Processing ${filename}... `);

    try {
      const result = await importXmlFile(db, filepath, filename);

      if (result.skipped) {
        console.log("SKIPPED (already exists)");
        skipped++;
      } else {
        console.log(`OK (${result.verses.toLocaleString()} verses)`);
        imported++;
        totalVerses += result.verses;
        filesToDelete.push(filepath);
      }
    } catch (error) {
      console.log(`ERROR: ${error}`);
    }
  }

  // Build FTS index if we imported anything
  if (imported > 0) {
    createFtsTable(db);
  }

  // Close database
  db.close();

  // Delete imported XML files
  if (filesToDelete.length > 0) {
    console.log("\nDeleting imported XML files...");
    for (const filepath of filesToDelete) {
      await unlink(filepath);
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Imported: ${imported} translation(s)`);
  console.log(`Skipped:  ${skipped} translation(s)`);
  console.log(`Verses:   ${totalVerses.toLocaleString()}`);
  console.log(`Database: ${DB_PATH}`);
}

main().catch(console.error);
