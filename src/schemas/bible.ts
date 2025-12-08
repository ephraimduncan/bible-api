import { z } from "zod";

// Core domain schemas

export const TestamentSchema = z.enum(["old", "new"]);
export type Testament = z.infer<typeof TestamentSchema>;

export const BookInfoSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string(),
  testament: TestamentSchema,
  chapters: z.number(),
});
export type BookInfo = z.infer<typeof BookInfoSchema>;

export const VerseSchema = z.object({
  number: z.number(),
  text: z.string(),
});
export type Verse = z.infer<typeof VerseSchema>;

export const ChapterSchema = z.object({
  number: z.number(),
  verses: z.array(VerseSchema),
});
export type Chapter = z.infer<typeof ChapterSchema>;

export const BookSchema = z.object({
  number: z.number(),
  chapters: z.array(ChapterSchema),
});
export type Book = z.infer<typeof BookSchema>;

export const ParsedBibleSchema = z.object({
  translation: z.string(),
  status: z.string(),
  link: z.string().optional(),
  testaments: z.object({
    old: z.array(BookSchema),
    new: z.array(BookSchema),
  }),
});
export type ParsedBible = z.infer<typeof ParsedBibleSchema>;

export const TranslationMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  status: z.string(),
  filename: z.string(),
});
export type TranslationMeta = z.infer<typeof TranslationMetaSchema>;

export const LanguageInfoSchema = z.object({
  code: z.string(),
  name: z.string(),
  native_name: z.string(),
  default: z.boolean().optional(),
});
export type LanguageInfo = z.infer<typeof LanguageInfoSchema>;

export const ParsedReferenceSchema = z.object({
  book: z.string(),
  chapter: z.number(),
  verseStart: z.number(),
  verseEnd: z.number().optional(),
});
export type ParsedReference = z.infer<typeof ParsedReferenceSchema>;

export const BookNamesSchema = z.object({
  en: z.string(),
  fr: z.string(),
});
export type BookNames = z.infer<typeof BookNamesSchema>;

export const BookDataSchema = z.object({
  id: z.string(),
  number: z.number(),
  testament: TestamentSchema,
  chapters: z.number(),
  names: BookNamesSchema,
  aliases: z.array(z.string()),
});
export type BookData = z.infer<typeof BookDataSchema>;
