import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  parseReference,
  formatReference,
  parseMultipleReferences,
} from "../services/reference-parser";
import {
  getDefaultTranslation,
  getTranslationMeta,
  getVerseFromDb,
  getVerseRangeFromDb,
} from "../services/bible-loader";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../data/books";
import {
  TranslationQuerySchema,
  RefsQuerySchema,
  CompareQuerySchema,
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
  const {
    refs,
    language: langParam,
    translation: translationId,
  } = c.req.valid("query");
  const language = langParam ?? DEFAULT_LANGUAGE;

  const translation = translationId
    ? await getTranslationMeta(translationId)
    : await getDefaultTranslation(language);

  if (!translation) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translationId ?? language}' not found`,
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

    const bookName =
      language === "fr" ? parsed.book.names.fr : parsed.book.names.en;

    results.push({
      reference: formatReference(parsed.reference, parsed.book, language),
      book: bookName,
      chapter: parsed.reference.chapter,
      verse: verse.number,
      text: verse.text,
    });
  }

  return c.json(
    {
      translation: translation.id,
      language,
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
  description:
    "Compare a verse across multiple translations or languages. Provide either translations or languages parameter.",
  request: {
    params: VerseRefParamSchema,
    query: CompareQuerySchema,
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
      description:
        "Invalid reference or missing translations/languages parameter",
    },
  },
});

verses.openapi(compareVerseRoute, async (c) => {
  const { ref } = c.req.valid("param");
  const { translations: translationsParam, languages: languagesParam } =
    c.req.valid("query");

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

  const comparisons: Array<{
    language: string;
    languageName: string;
    translation: string;
    translationName: string;
    bookName: string;
    text: string;
  }> = [];

  if (translationsParam) {
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

      const lang = translation.language;
      const langInfo = LANGUAGES[lang] || { name: lang, nativeName: lang };
      const bookName =
        lang === "fr" ? parsed.book.names.fr : parsed.book.names.en;

      comparisons.push({
        language: lang,
        languageName: langInfo.name,
        translation: translation.id,
        translationName: translation.name,
        bookName,
        text: verse.text,
      });
    }
  } else if (languagesParam) {
    const langs = languagesParam.split(",").map((l) => l.trim());

    for (const lang of langs) {
      const translation = await getDefaultTranslation(lang);
      if (!translation) continue;

      const verse = getVerseFromDb(
        translation.id,
        parsed.book.number,
        parsed.reference.chapter,
        parsed.reference.verseStart
      );
      if (!verse) continue;

      const langInfo = LANGUAGES[lang] || { name: lang, nativeName: lang };
      const bookName =
        lang === "fr" ? parsed.book.names.fr : parsed.book.names.en;

      comparisons.push({
        language: lang,
        languageName: langInfo.name,
        translation: translation.id,
        translationName: translation.name,
        bookName,
        text: verse.text,
      });
    }
  } else {
    return c.json(
      {
        error: {
          code: "MISSING_PARAMETER",
          message:
            "Either translations or languages query parameter is required",
        },
      },
      400
    );
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
    query: TranslationQuerySchema,
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
  const { language: langParam, translation: translationId } =
    c.req.valid("query");
  const language = langParam ?? DEFAULT_LANGUAGE;

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

  const translation = translationId
    ? await getTranslationMeta(translationId)
    : await getDefaultTranslation(language);

  if (!translation) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translationId ?? language}' not found`,
        },
      },
      404
    );
  }

  const bookName =
    language === "fr" ? parsed.book.names.fr : parsed.book.names.en;

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
        reference: formatReference(parsed.reference, parsed.book, language),
        translation: translation.id,
        language,
        book: { id: parsed.book.id, name: bookName },
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
      reference: formatReference(parsed.reference, parsed.book, language),
      translation: translation.id,
      language,
      book: { id: parsed.book.id, name: bookName },
      chapter: parsed.reference.chapter,
      verse: verse.number,
      text: verse.text,
    },
    200
  );
});

export default verses;
