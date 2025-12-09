import type { TranslationMeta, Verse, TranslationRow } from "../schemas";
import {
  getAllTranslations,
  getTranslationById,
  getVerse as dbGetVerse,
  getVerseRange as dbGetVerseRange,
  getChapterVerses as dbGetChapterVerses,
  getChapterCounts,
} from "./database";

function rowToMeta(row: TranslationRow): TranslationMeta {
  return {
    id: row.id,
    name: row.name,
    status: row.status || "Unknown",
    filename: row.filename || "",
  };
}

export async function discoverTranslations(): Promise<TranslationMeta[]> {
  const rows = getAllTranslations();
  return rows.map(rowToMeta);
}

export async function getTranslationMeta(
  id: string
): Promise<TranslationMeta | undefined> {
  const row = getTranslationById(id);
  return row ? rowToMeta(row) : undefined;
}

export function getVerseFromDb(
  translationId: string,
  bookNumber: number,
  chapterNumber: number,
  verseNumber: number
): Verse | undefined {
  const row = dbGetVerse(translationId, bookNumber, chapterNumber, verseNumber);
  if (!row) return undefined;
  return { number: row.verse, text: row.text };
}

export function getVerseRangeFromDb(
  translationId: string,
  bookNumber: number,
  chapterNumber: number,
  startVerse: number,
  endVerse: number
): Verse[] {
  const rows = dbGetVerseRange(
    translationId,
    bookNumber,
    chapterNumber,
    startVerse,
    endVerse
  );
  return rows.map((r) => ({ number: r.verse, text: r.text }));
}

export function getChapterVersesFromDb(
  translationId: string,
  bookNumber: number,
  chapterNumber: number
): Verse[] {
  const rows = dbGetChapterVerses(translationId, bookNumber, chapterNumber);
  return rows.map((r) => ({ number: r.verse, text: r.text }));
}

export function getBookChaptersFromDb(
  translationId: string,
  bookNumber: number
): Array<{ number: number; verses: number }> {
  const rows = getChapterCounts(translationId, bookNumber);
  return rows.map((r) => ({ number: r.chapter, verses: r.verse_count }));
}

export function clearCache(): void {}
