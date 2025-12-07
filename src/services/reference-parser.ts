import type { ParsedReference } from '../types/bible';
import { getBookByIdOrAlias, type BookData } from '../data/books';

export interface ParseResult {
  success: true;
  reference: ParsedReference;
  book: BookData;
}

export interface ParseError {
  success: false;
  error: string;
}

export type ParsedRefResult = ParseResult | ParseError;

/**
 * Parse a verse reference string into its components
 * Supported formats:
 * - gen.1.1       -> Genesis 1:1
 * - jhn.3.16      -> John 3:16
 * - psa.23.1-6    -> Psalm 23:1-6
 * - genesis.1.1   -> Genesis 1:1
 * - 1cor.13.4     -> 1 Corinthians 13:4
 */
export function parseReference(ref: string): ParsedRefResult {
  const normalized = ref.toLowerCase().trim();

  // Match pattern: book.chapter.verse or book.chapter.verseStart-verseEnd
  // Book can be: gen, genesis, 1cor, 1corinthians, etc.
  const match = normalized.match(/^([a-z0-9]+)\.(\d+)\.(\d+)(?:-(\d+))?$/);

  if (!match) {
    return {
      success: false,
      error: `Invalid reference format: "${ref}". Expected format: book.chapter.verse (e.g., gen.1.1 or jhn.3.16-17)`,
    };
  }

  const [, bookId, chapterStr, verseStartStr, verseEndStr] = match;
  const book = getBookByIdOrAlias(bookId);

  if (!book) {
    return {
      success: false,
      error: `Unknown book: "${bookId}". Use standard abbreviations like gen, exo, mat, jhn, etc.`,
    };
  }

  const chapter = parseInt(chapterStr, 10);
  const verseStart = parseInt(verseStartStr, 10);
  const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : undefined;

  if (chapter < 1 || chapter > book.chapters) {
    return {
      success: false,
      error: `Invalid chapter ${chapter} for ${book.names.en}. Valid range: 1-${book.chapters}`,
    };
  }

  if (verseEnd !== undefined && verseEnd < verseStart) {
    return {
      success: false,
      error: `Invalid verse range: ${verseStart}-${verseEnd}. End verse must be >= start verse.`,
    };
  }

  return {
    success: true,
    reference: {
      book: book.id,
      chapter,
      verseStart,
      verseEnd,
    },
    book,
  };
}

/**
 * Format a reference for display
 * e.g., formatReference({ book: 'gen', chapter: 1, verseStart: 1 }, 'en') -> "Genesis 1:1"
 */
export function formatReference(
  ref: ParsedReference,
  book: BookData,
  language: string = 'en'
): string {
  const bookName = language === 'fr' ? book.names.fr : book.names.en;

  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    return `${bookName} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
  }

  return `${bookName} ${ref.chapter}:${ref.verseStart}`;
}

/**
 * Parse multiple comma-separated references
 * e.g., "jhn.3.16,rom.8.28,psa.23.1"
 */
export function parseMultipleReferences(refs: string): ParsedRefResult[] {
  const parts = refs.split(',').map((r) => r.trim());
  return parts.map(parseReference);
}
