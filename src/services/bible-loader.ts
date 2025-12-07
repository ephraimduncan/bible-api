import { XMLParser } from 'fast-xml-parser';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { TranslationMeta, ParsedBible, Book, Chapter, Verse } from '../types/bible';

const BIBLE_DIR = join(import.meta.dir, '../../bible');

interface XmlVerse {
  '@_number': string;
  '#text': string;
}

interface XmlChapter {
  '@_number': string;
  verse: XmlVerse | XmlVerse[];
}

interface XmlBook {
  '@_number': string;
  chapter: XmlChapter | XmlChapter[];
}

interface XmlTestament {
  '@_name': string;
  book: XmlBook | XmlBook[];
}

interface XmlBible {
  '@_translation'?: string;
  '@_name'?: string;
  '@_status'?: string;
  '@_link'?: string;
  testament: XmlTestament | XmlTestament[];
}

interface XmlRoot {
  bible: XmlBible;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

// Simple LRU cache
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const translationCache = new LRUCache<ParsedBible>(10);
let translationsMeta: TranslationMeta[] | null = null;

function parseLanguageFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.startsWith('english')) return 'en';
  if (lower.startsWith('french')) return 'fr';
  if (lower.startsWith('spanish')) return 'es';
  if (lower.startsWith('german')) return 'de';
  if (lower.startsWith('portuguese')) return 'pt';
  if (lower.startsWith('chinese')) return 'zh';
  return 'en';
}

function parseTranslationIdFromFilename(filename: string): string {
  const baseName = filename.replace('.xml', '').replace('Bible', '');
  const language = parseLanguageFromFilename(filename);

  // Extract abbreviation from filename
  // EnglishKJBible.xml -> KJ -> kjv
  // EnglishNIVBible.xml -> NIV -> niv
  // FrenchBible.xml -> lsg (default French)
  // French2004Bible.xml -> 2004

  let abbr = '';

  if (baseName.startsWith('English')) {
    abbr = baseName.replace('English', '').toLowerCase();
    // Handle common abbreviation mappings
    if (abbr === 'kj') abbr = 'kjv';
    if (abbr === 'amplifiedclassic') abbr = 'ampc';
    if (abbr === 'amplified') abbr = 'amp';
    if (abbr === 'nkj') abbr = 'nkjv';
    if (abbr === 'nasu') abbr = 'nasb95';
    if (abbr === '') abbr = 'kjv';
  } else if (baseName.startsWith('French')) {
    abbr = baseName.replace('French', '').toLowerCase();
    if (abbr === '') abbr = 'lsg';
    if (abbr === '2004') abbr = 'lsg2004';
    if (abbr === 'nbs') abbr = 'nbs';
  } else {
    abbr = baseName.toLowerCase();
  }

  return `${language}-${abbr || 'default'}`;
}

export async function discoverTranslations(): Promise<TranslationMeta[]> {
  if (translationsMeta) return translationsMeta;

  const files = await readdir(BIBLE_DIR);
  const xmlFiles = files.filter((f) => f.endsWith('.xml'));

  translationsMeta = [];

  for (const filename of xmlFiles) {
    const id = parseTranslationIdFromFilename(filename);
    const language = parseLanguageFromFilename(filename);

    // Read just enough to get metadata
    const filepath = join(BIBLE_DIR, filename);
    const content = await readFile(filepath, 'utf-8');
    const parsed = parser.parse(content) as XmlRoot;
    const bible = parsed.bible;

    const name = bible['@_translation'] || bible['@_name'] || filename.replace('.xml', '');
    const status = bible['@_status'] || 'Unknown';

    translationsMeta.push({
      id,
      name,
      language,
      status,
      filename,
    });
  }

  return translationsMeta;
}

export async function getTranslationMeta(id: string): Promise<TranslationMeta | undefined> {
  const translations = await discoverTranslations();
  return translations.find((t) => t.id === id);
}

export async function getTranslationsByLanguage(language: string): Promise<TranslationMeta[]> {
  const translations = await discoverTranslations();
  return translations.filter((t) => t.language === language);
}

export async function getDefaultTranslation(language: string): Promise<TranslationMeta | undefined> {
  const translations = await getTranslationsByLanguage(language);
  if (translations.length === 0) return undefined;

  // Prefer common defaults
  const defaults: Record<string, string> = {
    en: 'en-kjv',
    fr: 'fr-lsg',
  };

  const defaultId = defaults[language];
  if (defaultId) {
    const found = translations.find((t) => t.id === defaultId);
    if (found) return found;
  }

  return translations[0];
}

function parseVerses(verseData: XmlVerse | XmlVerse[]): Verse[] {
  const verses = Array.isArray(verseData) ? verseData : [verseData];
  return verses.map((v) => ({
    number: parseInt(v['@_number'], 10),
    text: v['#text'] || '',
  }));
}

function parseChapters(chapterData: XmlChapter | XmlChapter[]): Chapter[] {
  const chapters = Array.isArray(chapterData) ? chapterData : [chapterData];
  return chapters.map((c) => ({
    number: parseInt(c['@_number'], 10),
    verses: c.verse ? parseVerses(c.verse) : [],
  }));
}

function parseBooks(bookData: XmlBook | XmlBook[]): Book[] {
  const books = Array.isArray(bookData) ? bookData : [bookData];
  return books.map((b) => ({
    number: parseInt(b['@_number'], 10),
    chapters: b.chapter ? parseChapters(b.chapter) : [],
  }));
}

export async function loadTranslation(id: string): Promise<ParsedBible | undefined> {
  const cached = translationCache.get(id);
  if (cached) return cached;

  const meta = await getTranslationMeta(id);
  if (!meta) return undefined;

  const filepath = join(BIBLE_DIR, meta.filename);
  const content = await readFile(filepath, 'utf-8');
  const parsed = parser.parse(content) as XmlRoot;
  const bible = parsed.bible;

  const testaments = Array.isArray(bible.testament) ? bible.testament : [bible.testament];
  const oldTestament = testaments.find((t) => t['@_name'] === 'Old');
  const newTestament = testaments.find((t) => t['@_name'] === 'New');

  const result: ParsedBible = {
    translation: bible['@_translation'] || bible['@_name'] || meta.name,
    status: bible['@_status'] || 'Unknown',
    link: bible['@_link'],
    testaments: {
      old: oldTestament?.book ? parseBooks(oldTestament.book) : [],
      new: newTestament?.book ? parseBooks(newTestament.book) : [],
    },
  };

  translationCache.set(id, result);
  return result;
}

export function getBook(bible: ParsedBible, bookNumber: number): Book | undefined {
  if (bookNumber <= 39) {
    return bible.testaments.old.find((b) => b.number === bookNumber);
  }
  return bible.testaments.new.find((b) => b.number === bookNumber);
}

export function getChapter(book: Book, chapterNumber: number): Chapter | undefined {
  return book.chapters.find((c) => c.number === chapterNumber);
}

export function getVerse(chapter: Chapter, verseNumber: number): Verse | undefined {
  return chapter.verses.find((v) => v.number === verseNumber);
}

export function getVerseRange(chapter: Chapter, start: number, end: number): Verse[] {
  return chapter.verses.filter((v) => v.number >= start && v.number <= end);
}

export async function getAvailableLanguages(): Promise<string[]> {
  const translations = await discoverTranslations();
  const languages = new Set(translations.map((t) => t.language));
  return Array.from(languages);
}

export function clearCache(): void {
  translationCache.clear();
  translationsMeta = null;
}
