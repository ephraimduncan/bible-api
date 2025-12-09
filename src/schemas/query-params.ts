import { z } from "zod";

// Query parameter schemas for API routes

export const TranslationOnlyQuerySchema = z.object({
  translation: z.string().optional(),
});
export type TranslationOnlyQuery = z.infer<typeof TranslationOnlyQuerySchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Missing q query parameter"),
  translation: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 10;
      return Math.min(parsed, 100); // Cap at 100
    })
    .pipe(z.number().min(1)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().min(0)),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const RefsQuerySchema = z.object({
  refs: z.string().min(1, "refs parameter is required"),
  translation: z.string().optional(),
});
export type RefsQuery = z.infer<typeof RefsQuerySchema>;

export const CompareTranslationsQuerySchema = z.object({
  translations: z.string().optional(),
});
export type CompareTranslationsQuery = z.infer<typeof CompareTranslationsQuerySchema>;
