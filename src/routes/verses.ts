import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  parseReference,
  formatReference,
  parseMultipleReferences,
} from "../services/reference-parser";
import {
  getTranslationMeta,
  getVerseFromDb,
  getVerseRangeFromDb,
} from "../services/bible-loader";
import { DEFAULT_TRANSLATION } from "../data/books";
import {
  TranslationOnlyQuerySchema,
  RefsQuerySchema,
  CompareTranslationsQuerySchema,
  VerseRefParamSchema,
  VerseResponseSchema,
  VersesRangeResponseSchema,
  MultipleVersesResponseSchema,
  CompareResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const verses = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const issues = result.error.issues;
      const isMissingRefs = issues.some(
        (i) =>
          i.path[0] === "refs" &&
          (i.code === "too_small" || i.code === "invalid_type")
      );

      if (isMissingRefs) {
        return c.json(
          {
            error: {
              code: "MISSING_REFS",
              message: "refs parameter is required",
            },
          },
          400
        );
      }

      return c.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: result.error.message,
          },
        },
        400
      );
    }
  },
});

const getMultipleVersesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Verses"],
  summary: "Get multiple verses",
  description:
    "Get multiple verses by comma-separated dotted refs (e.g., refs=jhn.3.16,rom.8.28)",
  request: {
    query: RefsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: MultipleVersesResponseSchema,
        },
      },
      description: "Multiple verses retrieved successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Missing refs parameter or invalid reference",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Translation not found",
    },
  },
});

verses.openapi(getMultipleVersesRoute, async (c) => {
  const { refs, translation: translationId } = c.req.valid("query");

  const translation = await getTranslationMeta(translationId ?? DEFAULT_TRANSLATION);

  if (!translation) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translationId ?? DEFAULT_TRANSLATION}' not found`,
        },
      },
      404
    );
  }

  const parsedRefs = parseMultipleReferences(refs);
  const results: Array<{
    reference: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }> = [];

  for (const parsed of parsedRefs) {
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "INVALID_REFERENCE",
            message: parsed.error,
          },
        },
        400
      );
    }

    const verse = getVerseFromDb(
      translation.id,
      parsed.book.number,
      parsed.reference.chapter,
      parsed.reference.verseStart
    );
    if (!verse) continue;

    results.push({
      reference: formatReference(parsed.reference, parsed.book, "en"),
      book: parsed.book.names.en,
      chapter: parsed.reference.chapter,
      verse: verse.number,
      text: verse.text,
    });
  }

  return c.json(
    {
      translation: translation.id,
      verses: results,
    },
    200
  );
});

const compareVerseRoute = createRoute({
  method: "get",
  path: "/{ref}/compare",
  tags: ["Verses"],
  summary: "Compare verse across translations",
  description: "Compare a verse across multiple translations.",
  request: {
    params: VerseRefParamSchema,
    query: CompareTranslationsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: CompareResponseSchema,
        },
      },
      description: "Verse comparison across translations",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid reference or missing translations parameter",
    },
  },
});

verses.openapi(compareVerseRoute, async (c) => {
  const { ref } = c.req.valid("param");
  const { translations: translationsParam } = c.req.valid("query");

  const parsed = parseReference(ref);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_REFERENCE",
          message: parsed.error,
        },
      },
      400
    );
  }

  if (!translationsParam) {
    return c.json(
      {
        error: {
          code: "MISSING_PARAMETER",
          message: "translations query parameter is required",
        },
      },
      400
    );
  }

  const comparisons: Array<{
    translation: string;
    translationName: string;
    bookName: string;
    text: string;
  }> = [];

  const translationIds = translationsParam.split(",").map((t) => t.trim());

  for (const transId of translationIds) {
    const translation = await getTranslationMeta(transId);
    if (!translation) continue;

    const verse = getVerseFromDb(
      transId,
      parsed.book.number,
      parsed.reference.chapter,
      parsed.reference.verseStart
    );
    if (!verse) continue;

    comparisons.push({
      translation: translation.id,
      translationName: translation.name,
      bookName: parsed.book.names.en,
      text: verse.text,
    });
  }

  return c.json(
    {
      reference: formatReference(parsed.reference, parsed.book, "en"),
      book: { id: parsed.book.id },
      chapter: parsed.reference.chapter,
      verse: parsed.reference.verseStart,
      comparisons,
    },
    200
  );
});

const getVerseRoute = createRoute({
  method: "get",
  path: "/{ref}",
  tags: ["Verses"],
  summary: "Get a verse or verse range",
  description:
    "Get a single verse (e.g., jhn.3.16) or a range (e.g., rom.8.28-30) using dotted refs",
  request: {
    params: VerseRefParamSchema,
    query: TranslationOnlyQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: VerseResponseSchema.or(VersesRangeResponseSchema),
        },
      },
      description: "Verse or verse range retrieved successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid verse reference",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Verse or translation not found",
    },
  },
});

verses.openapi(getVerseRoute, async (c) => {
  const { ref } = c.req.valid("param");
  const { translation: translationId } = c.req.valid("query");

  const parsed = parseReference(ref);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "INVALID_REFERENCE",
          message: parsed.error,
        },
      },
      400
    );
  }

  const translation = await getTranslationMeta(translationId ?? DEFAULT_TRANSLATION);

  if (!translation) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translationId ?? DEFAULT_TRANSLATION}' not found`,
        },
      },
      404
    );
  }

  if (
    parsed.reference.verseEnd &&
    parsed.reference.verseEnd !== parsed.reference.verseStart
  ) {
    const versesInRange = getVerseRangeFromDb(
      translation.id,
      parsed.book.number,
      parsed.reference.chapter,
      parsed.reference.verseStart,
      parsed.reference.verseEnd
    );

    if (versesInRange.length === 0) {
      return c.json(
        {
          error: {
            code: "VERSE_NOT_FOUND",
            message: `Verses ${parsed.reference.verseStart}-${parsed.reference.verseEnd} not found`,
          },
        },
        404
      );
    }

    return c.json(
      {
        reference: formatReference(parsed.reference, parsed.book, "en"),
        translation: translation.id,
        book: { id: parsed.book.id, name: parsed.book.names.en },
        chapter: parsed.reference.chapter,
        verses: versesInRange.map((v) => ({
          number: v.number,
          text: v.text,
        })),
      },
      200
    );
  }

  const verse = getVerseFromDb(
    translation.id,
    parsed.book.number,
    parsed.reference.chapter,
    parsed.reference.verseStart
  );

  if (!verse) {
    return c.json(
      {
        error: {
          code: "VERSE_NOT_FOUND",
          message: `Verse ${parsed.reference.verseStart} not found`,
        },
      },
      404
    );
  }

  return c.json(
    {
      reference: formatReference(parsed.reference, parsed.book, "en"),
      translation: translation.id,
      book: { id: parsed.book.id, name: parsed.book.names.en },
      chapter: parsed.reference.chapter,
      verse: verse.number,
      text: verse.text,
    },
    200
  );
});

export default verses;
