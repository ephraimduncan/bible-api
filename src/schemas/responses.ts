import { z } from "zod";
import { TestamentSchema } from "./bible";

// API Response schemas

export const TranslationItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  default: z.boolean().optional(),
});
export type TranslationItem = z.infer<typeof TranslationItemSchema>;

export const TranslationsResponseSchema = z.object({
  default: z.string(),
  translations: z.array(TranslationItemSchema),
});
export type TranslationsResponse = z.infer<typeof TranslationsResponseSchema>;

export const BookListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  testament: TestamentSchema,
  chapters: z.number(),
});
export type BookListItem = z.infer<typeof BookListItemSchema>;

export const BooksResponseSchema = z.object({
  translation: z.string(),
  books: z.array(BookListItemSchema),
});
export type BooksResponse = z.infer<typeof BooksResponseSchema>;

export const BookResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  testament: TestamentSchema,
  chapters: z.number(),
});
export type BookResponse = z.infer<typeof BookResponseSchema>;

export const BookRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type BookRef = z.infer<typeof BookRefSchema>;

export const ChapterSummarySchema = z.object({
  number: z.number(),
  verses: z.number(),
});
export type ChapterSummary = z.infer<typeof ChapterSummarySchema>;

export const ChaptersResponseSchema = z.object({
  book: BookRefSchema,
  chapters: z.array(ChapterSummarySchema),
});
export type ChaptersResponse = z.infer<typeof ChaptersResponseSchema>;

export const VerseTextSchema = z.object({
  number: z.number(),
  text: z.string(),
});
export type VerseText = z.infer<typeof VerseTextSchema>;

export const ChapterResponseSchema = z.object({
  translation: z.string(),
  book: BookRefSchema,
  chapter: z.number(),
  verses: z.array(VerseTextSchema),
});
export type ChapterResponse = z.infer<typeof ChapterResponseSchema>;

export const VerseResponseSchema = z.object({
  reference: z.string(),
  translation: z.string(),
  book: BookRefSchema,
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
});
export type VerseResponse = z.infer<typeof VerseResponseSchema>;

export const VersesRangeResponseSchema = z.object({
  reference: z.string(),
  translation: z.string(),
  book: BookRefSchema,
  chapter: z.number(),
  verses: z.array(VerseTextSchema),
});
export type VersesRangeResponse = z.infer<typeof VersesRangeResponseSchema>;

export const MultipleVerseItemSchema = z.object({
  reference: z.string(),
  book: z.string(),
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
});
export type MultipleVerseItem = z.infer<typeof MultipleVerseItemSchema>;

export const MultipleVersesResponseSchema = z.object({
  translation: z.string(),
  verses: z.array(MultipleVerseItemSchema),
});
export type MultipleVersesResponse = z.infer<typeof MultipleVersesResponseSchema>;

export const ComparisonItemSchema = z.object({
  translation: z.string(),
  translationName: z.string(),
  bookName: z.string(),
  text: z.string(),
});
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;

export const CompareResponseSchema = z.object({
  reference: z.string(),
  book: z.object({ id: z.string() }),
  chapter: z.number(),
  verse: z.number(),
  comparisons: z.array(ComparisonItemSchema),
});
export type CompareResponse = z.infer<typeof CompareResponseSchema>;

export const SearchResultSchema = z.object({
  reference: z.string(),
  text: z.string(),
  highlight: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  translation: z.string(),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  results: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    suggestion: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
