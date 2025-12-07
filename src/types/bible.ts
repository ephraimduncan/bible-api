export type Testament = 'old' | 'new';

export interface BookInfo {
  id: string;
  number: number;
  name: string;
  testament: Testament;
  chapters: number;
}

export interface Verse {
  number: number;
  text: string;
}

export interface Chapter {
  number: number;
  verses: Verse[];
}

export interface Book {
  number: number;
  chapters: Chapter[];
}

export interface ParsedBible {
  translation: string;
  status: string;
  link?: string;
  testaments: {
    old: Book[];
    new: Book[];
  };
}

export interface TranslationMeta {
  id: string;
  name: string;
  language: string;
  status: string;
  filename: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
  default?: boolean;
}

// API Response Types
export interface LanguagesResponse {
  default: string;
  languages: LanguageInfo[];
}

export interface TranslationsResponse {
  default: string;
  language?: string;
  translations: Array<{
    id: string;
    name: string;
    language: string;
    status: string;
    default?: boolean;
  }>;
}

export interface BooksResponse {
  translation: string;
  language: string;
  books: Array<{
    id: string;
    name: string;
    testament: Testament;
    chapters: number;
  }>;
}

export interface BookResponse {
  id: string;
  name: string;
  language: string;
  testament: Testament;
  chapters: number;
}

export interface ChaptersResponse {
  book: { id: string; name: string };
  language: string;
  chapters: Array<{
    number: number;
    verses: number;
  }>;
}

export interface ChapterResponse {
  translation: string;
  language: string;
  book: { id: string; name: string };
  chapter: number;
  verses: Array<{
    number: number;
    text: string;
  }>;
}

export interface VerseResponse {
  reference: string;
  translation: string;
  language: string;
  book: { id: string; name: string };
  chapter: number;
  verse: number;
  text: string;
}

export interface VersesRangeResponse {
  reference: string;
  translation: string;
  language: string;
  book: { id: string; name: string };
  chapter: number;
  verses: Array<{
    number: number;
    text: string;
  }>;
}

export interface MultipleVersesResponse {
  translation: string;
  language: string;
  verses: Array<{
    reference: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
}

export interface CompareResponse {
  reference: string;
  book: { id: string };
  chapter: number;
  verse: number;
  comparisons: Array<{
    language: string;
    languageName: string;
    translation: string;
    translationName: string;
    bookName: string;
    text: string;
  }>;
}

export interface SearchResult {
  reference: string;
  text: string;
  highlight: string;
}

export interface SearchResponse {
  query: string;
  translation: string;
  language: string;
  total: number;
  limit: number;
  offset: number;
  results: SearchResult[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

export interface ParsedReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}
