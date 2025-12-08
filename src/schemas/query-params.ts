import { z } from "zod";

// Query parameter schemas for API routes

export const LanguageQuerySchema = z.object({
  language: z.string().optional(),
});
export type LanguageQuery = z.infer<typeof LanguageQuerySchema>;

export const TranslationQuerySchema = z.object({
  language: z.string().optional(),
  translation: z.string().optional(),
});
export type TranslationQuery = z.infer<typeof TranslationQuerySchema>;

export const SearchQuerySchema = z.object({
  q: z.string({ required_error: "Missing q query parameter" }).min(1, "Missing q query parameter"),
  language: z.string().optional(),
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
  language: z.string().optional(),
  translation: z.string().optional(),
});
export type RefsQuery = z.infer<typeof RefsQuerySchema>;

export const CompareQuerySchema = z.object({
  translations: z.string().optional(),
  languages: z.string().optional(),
});
export type CompareQuery = z.infer<typeof CompareQuerySchema>;
