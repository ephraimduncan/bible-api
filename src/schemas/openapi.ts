import { z } from "@hono/zod-openapi";

export const LanguageQuerySchema = z.object({
  language: z
    .string()
    .optional()
    .openapi({
      param: { name: "language", in: "query" },
      example: "en",
      description: "Language code (e.g., 'en', 'fr')",
    }),
});

export const TranslationQuerySchema = z.object({
  language: z
    .string()
    .optional()
    .openapi({
      param: { name: "language", in: "query" },
      example: "en",
      description: "Language code (e.g., 'en', 'fr')",
    }),
  translation: z
    .string()
    .optional()
    .openapi({
      param: { name: "translation", in: "query" },
      example: "en-kjv",
      description: "Translation ID (e.g., 'en-kjv', 'fr-lsg')",
    }),
});

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1)
    .openapi({
      param: { name: "q", in: "query" },
      example: "love",
      description: "Search query string",
    }),
  language: z
    .string()
    .optional()
    .openapi({
      param: { name: "language", in: "query" },
      example: "en",
      description: "Language code",
    }),
  translation: z
    .string()
    .optional()
    .openapi({
      param: { name: "translation", in: "query" },
      example: "en-kjv",
      description: "Translation ID",
    }),
  limit: z
    .string()
    .optional()
    .openapi({
      param: { name: "limit", in: "query" },
      example: "10",
      description: "Maximum number of results (default: 10, max: 100)",
    }),
  offset: z
    .string()
    .optional()
    .openapi({
      param: { name: "offset", in: "query" },
      example: "0",
      description: "Offset for pagination (default: 0)",
    }),
});

export const RefsQuerySchema = z.object({
  refs: z
    .string()
    .min(1)
    .openapi({
      param: { name: "refs", in: "query" },
      example: "jhn.3.16,rom.8.28",
      description:
        "Comma-separated list of verse references in dotted format (book.chapter.verse or book.chapter.verseStart-verseEnd)",
    }),
  language: z
    .string()
    .optional()
    .openapi({
      param: { name: "language", in: "query" },
      example: "en",
      description: "Language code",
    }),
  translation: z
    .string()
    .optional()
    .openapi({
      param: { name: "translation", in: "query" },
      example: "en-kjv",
      description: "Translation ID",
    }),
});

export const CompareQuerySchema = z.object({
  translations: z
    .string()
    .optional()
    .openapi({
      param: { name: "translations", in: "query" },
      example: "en-kjv,en-web",
      description: "Comma-separated list of translation IDs to compare",
    }),
  languages: z
    .string()
    .optional()
    .openapi({
      param: { name: "languages", in: "query" },
      example: "en,fr",
      description: "Comma-separated list of language codes to compare",
    }),
});

// Path parameter schemas

export const BookIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    example: "genesis",
    description: "Book ID or alias (e.g., 'genesis', 'gen', 'gn')",
  }),
});

export const ChapterParamSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    example: "john",
    description: "Book ID or alias",
  }),
  chapter: z.string().openapi({
    param: { name: "chapter", in: "path" },
    example: "3",
    description: "Chapter number",
  }),
});

export const VerseRefParamSchema = z.object({
  ref: z.string().openapi({
    param: { name: "ref", in: "path" },
    example: "jhn.3.16",
    description:
      "Verse reference in dotted format (e.g., 'jhn.3.16', 'rom.8.28-30')",
  }),
});

// OpenAPI-enhanced response schemas

export const TestamentSchema = z.enum(["old", "new"]).openapi({
  example: "old",
  description: "Testament (Old or New)",
});

export const LanguageInfoSchema = z
  .object({
    code: z.string().openapi({ example: "en" }),
    name: z.string().openapi({ example: "English" }),
    native_name: z.string().openapi({ example: "English" }),
    default: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("LanguageInfo");

export const LanguagesResponseSchema = z
  .object({
    default: z.string().openapi({ example: "en" }),
    languages: z.array(LanguageInfoSchema),
  })
  .openapi("LanguagesResponse");

export const TranslationItemSchema = z
  .object({
    id: z.string().openapi({ example: "en-kjv" }),
    name: z.string().openapi({ example: "King James Version" }),
    language: z.string().openapi({ example: "en" }),
    status: z.string().openapi({ example: "complete" }),
    default: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("TranslationItem");

export const TranslationsResponseSchema = z
  .object({
    default: z.string().openapi({ example: "en-kjv" }),
    language: z.string().optional().openapi({ example: "en" }),
    translations: z.array(TranslationItemSchema),
  })
  .openapi("TranslationsResponse");

export const BookListItemSchema = z
  .object({
    id: z.string().openapi({ example: "genesis" }),
    name: z.string().openapi({ example: "Genesis" }),
    testament: TestamentSchema,
    chapters: z.number().openapi({ example: 50 }),
  })
  .openapi("BookListItem");

export const BooksResponseSchema = z
  .object({
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    books: z.array(BookListItemSchema),
  })
  .openapi("BooksResponse");

export const BookResponseSchema = z
  .object({
    id: z.string().openapi({ example: "genesis" }),
    name: z.string().openapi({ example: "Genesis" }),
    language: z.string().openapi({ example: "en" }),
    testament: TestamentSchema,
    chapters: z.number().openapi({ example: 50 }),
  })
  .openapi("BookResponse");

export const BookRefSchema = z
  .object({
    id: z.string().openapi({ example: "john" }),
    name: z.string().openapi({ example: "John" }),
  })
  .openapi("BookRef");

export const ChapterSummarySchema = z
  .object({
    number: z.number().openapi({ example: 1 }),
    verses: z.number().openapi({ example: 31 }),
  })
  .openapi("ChapterSummary");

export const ChaptersResponseSchema = z
  .object({
    book: BookRefSchema,
    language: z.string().openapi({ example: "en" }),
    chapters: z.array(ChapterSummarySchema),
  })
  .openapi("ChaptersResponse");

export const VerseTextSchema = z
  .object({
    number: z.number().openapi({ example: 16 }),
    text: z.string().openapi({
      example:
        "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    }),
  })
  .openapi("VerseText");

export const ChapterResponseSchema = z
  .object({
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    book: BookRefSchema,
    chapter: z.number().openapi({ example: 3 }),
    verses: z.array(VerseTextSchema),
  })
  .openapi("ChapterResponse");

export const VerseResponseSchema = z
  .object({
    reference: z.string().openapi({ example: "John 3:16" }),
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    book: BookRefSchema,
    chapter: z.number().openapi({ example: 3 }),
    verse: z.number().openapi({ example: 16 }),
    text: z.string().openapi({
      example:
        "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    }),
  })
  .openapi("VerseResponse");

export const VersesRangeResponseSchema = z
  .object({
    reference: z.string().openapi({ example: "Romans 8:28-30" }),
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    book: BookRefSchema,
    chapter: z.number().openapi({ example: 8 }),
    verses: z.array(VerseTextSchema),
  })
  .openapi("VersesRangeResponse");

export const MultipleVerseItemSchema = z
  .object({
    reference: z.string().openapi({ example: "John 3:16" }),
    book: z.string().openapi({ example: "John" }),
    chapter: z.number().openapi({ example: 3 }),
    verse: z.number().openapi({ example: 16 }),
    text: z.string().openapi({
      example:
        "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    }),
  })
  .openapi("MultipleVerseItem");

export const MultipleVersesResponseSchema = z
  .object({
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    verses: z.array(MultipleVerseItemSchema),
  })
  .openapi("MultipleVersesResponse");

export const ComparisonItemSchema = z
  .object({
    language: z.string().openapi({ example: "en" }),
    languageName: z.string().openapi({ example: "English" }),
    translation: z.string().openapi({ example: "en-kjv" }),
    translationName: z.string().openapi({ example: "King James Version" }),
    bookName: z.string().openapi({ example: "John" }),
    text: z.string().openapi({
      example:
        "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    }),
  })
  .openapi("ComparisonItem");

export const CompareResponseSchema = z
  .object({
    reference: z.string().openapi({ example: "John 3:16" }),
    book: z.object({ id: z.string().openapi({ example: "john" }) }),
    chapter: z.number().openapi({ example: 3 }),
    verse: z.number().openapi({ example: 16 }),
    comparisons: z.array(ComparisonItemSchema),
  })
  .openapi("CompareResponse");

export const SearchResultSchema = z
  .object({
    reference: z.string().openapi({ example: "John 3:16" }),
    text: z.string().openapi({
      example:
        "For God so loved the world, that he gave his only begotten Son...",
    }),
    highlight: z.string().openapi({
      example:
        "For God so <em>loved</em> the world, that he gave his only begotten Son...",
    }),
  })
  .openapi("SearchResult");

export const SearchResponseSchema = z
  .object({
    query: z.string().openapi({ example: "love" }),
    translation: z.string().openapi({ example: "en-kjv" }),
    language: z.string().openapi({ example: "en" }),
    total: z.number().openapi({ example: 150 }),
    limit: z.number().openapi({ example: 10 }),
    offset: z.number().openapi({ example: 0 }),
    results: z.array(SearchResultSchema),
  })
  .openapi("SearchResponse");

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "NOT_FOUND" }),
      message: z.string().openapi({ example: "Resource not found" }),
      suggestion: z.string().optional(),
    }),
  })
  .openapi("ErrorResponse");
