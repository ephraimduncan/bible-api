import { Hono } from "hono";
import {
  parseReference,
  formatReference,
  parseMultipleReferences,
} from "../services/reference-parser";
import {
  loadTranslation,
  getBook,
  getChapter,
  getVerse,
  getVerseRange,
  getDefaultTranslation,
  getTranslationMeta,
  getTranslationsByLanguage,
} from "../services/bible-loader";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../data/books";
import type {
  VerseResponse,
  VersesRangeResponse,
  MultipleVersesResponse,
  CompareResponse,
} from "../types/bible";

const verses = new Hono();

verses.get("/", async (c) => {
  const refs = c.req.query("refs");
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");

  if (!refs) {
    return c.json(
      {
        error: {
          code: "MISSING_REFS",
          message: "Missing refs query parameter",
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

  const bible = await loadTranslation(translation.id);
  if (!bible) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translation.id}' could not be loaded`,
        },
      },
      500
    );
  }

  const parsedRefs = parseMultipleReferences(refs);
  const results: MultipleVersesResponse["verses"] = [];

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

    const book = getBook(bible, parsed.book.number);
    if (!book) continue;

    const chapter = getChapter(book, parsed.reference.chapter);
    if (!chapter) continue;

    const verse = getVerse(chapter, parsed.reference.verseStart);
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

  const response: MultipleVersesResponse = {
    translation: translation.id,
    language,
    verses: results,
  };

  return c.json(response);
});

// GET /verses/:ref/compare - Compare across translations or languages
verses.get("/:ref/compare", async (c) => {
  const ref = c.req.param("ref");
  const translationsParam = c.req.query("translations");
  const languagesParam = c.req.query("languages");

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

  const comparisons: CompareResponse["comparisons"] = [];

  if (translationsParam) {
    const translationIds = translationsParam.split(",").map((t) => t.trim());

    for (const transId of translationIds) {
      const translation = await getTranslationMeta(transId);
      if (!translation) continue;

      const bible = await loadTranslation(transId);
      if (!bible) continue;

      const book = getBook(bible, parsed.book.number);
      if (!book) continue;

      const chapter = getChapter(book, parsed.reference.chapter);
      if (!chapter) continue;

      const verse = getVerse(chapter, parsed.reference.verseStart);
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

      const bible = await loadTranslation(translation.id);
      if (!bible) continue;

      const book = getBook(bible, parsed.book.number);
      if (!book) continue;

      const chapter = getChapter(book, parsed.reference.chapter);
      if (!chapter) continue;

      const verse = getVerse(chapter, parsed.reference.verseStart);
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

  const response: CompareResponse = {
    reference: formatReference(parsed.reference, parsed.book, "en"),
    book: { id: parsed.book.id },
    chapter: parsed.reference.chapter,
    verse: parsed.reference.verseStart,
    comparisons,
  };

  return c.json(response);
});

verses.get("/:ref", async (c) => {
  const ref = c.req.param("ref");
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");

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

  const bible = await loadTranslation(translation.id);
  if (!bible) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translation.id}' could not be loaded`,
        },
      },
      500
    );
  }

  const book = getBook(bible, parsed.book.number);
  if (!book) {
    return c.json(
      {
        error: {
          code: "BOOK_NOT_FOUND",
          message: `Book not found in translation`,
        },
      },
      404
    );
  }

  const chapter = getChapter(book, parsed.reference.chapter);
  if (!chapter) {
    return c.json(
      {
        error: {
          code: "CHAPTER_NOT_FOUND",
          message: `Chapter ${parsed.reference.chapter} not found`,
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
    const versesInRange = getVerseRange(
      chapter,
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

    const response: VersesRangeResponse = {
      reference: formatReference(parsed.reference, parsed.book, language),
      translation: translation.id,
      language,
      book: { id: parsed.book.id, name: bookName },
      chapter: parsed.reference.chapter,
      verses: versesInRange.map((v) => ({
        number: v.number,
        text: v.text,
      })),
    };

    return c.json(response);
  }

  const verse = getVerse(chapter, parsed.reference.verseStart);
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

  const response: VerseResponse = {
    reference: formatReference(parsed.reference, parsed.book, language),
    translation: translation.id,
    language,
    book: { id: parsed.book.id, name: bookName },
    chapter: parsed.reference.chapter,
    verse: verse.number,
    text: verse.text,
  };

  return c.json(response);
});

export default verses;
