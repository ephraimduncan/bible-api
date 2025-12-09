import { z } from "zod";

// Database row schemas

export const TranslationRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  filename: z.string().nullable(),
});
export type TranslationRow = z.infer<typeof TranslationRowSchema>;

export const VerseRowSchema = z.object({
  verse: z.number(),
  text: z.string(),
});
export type VerseRow = z.infer<typeof VerseRowSchema>;

export const ChapterCountRowSchema = z.object({
  chapter: z.number(),
  verse_count: z.number(),
});
export type ChapterCountRow = z.infer<typeof ChapterCountRowSchema>;

export const SearchRowSchema = z.object({
  book: z.number(),
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
});
export type SearchRow = z.infer<typeof SearchRowSchema>;
