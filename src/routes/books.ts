import { Hono } from "hono";
import { BOOKS, getBookByIdOrAlias, DEFAULT_LANGUAGE } from "../data/books";
import {
  getDefaultTranslation,
  getTranslationMeta,
  loadTranslation,
  getBook,
} from "../services/bible-loader";
import type {
  BooksResponse,
  BookResponse,
  ChaptersResponse,
  ChapterResponse,
} from "../types/bible";

const books = new Hono();

books.get("/", async (c) => {
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");

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

  const response: BooksResponse = {
    translation: translation.id,
    language,
    books: BOOKS.map((book) => ({
      id: book.id,
      name: language === "fr" ? book.names.fr : book.names.en,
      testament: book.testament,
      chapters: book.chapters,
    })),
  };

  return c.json(response);
});

books.get("/:id", async (c) => {
  const id = c.req.param("id");
  const language = c.req.query("language") || DEFAULT_LANGUAGE;

  const book = getBookByIdOrAlias(id);

  if (!book) {
    return c.json(
      {
        error: {
          code: "BOOK_NOT_FOUND",
          message: `Book '${id}' not found`,
        },
      },
      404
    );
  }

  const response: BookResponse = {
    id: book.id,
    name: language === "fr" ? book.names.fr : book.names.en,
    language,
    testament: book.testament,
    chapters: book.chapters,
  };

  return c.json(response);
});

books.get("/:id/chapters", async (c) => {
  const id = c.req.param("id");
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");

  const bookData = getBookByIdOrAlias(id);

  if (!bookData) {
    return c.json(
      {
        error: {
          code: "BOOK_NOT_FOUND",
          message: `Book '${id}' not found`,
        },
      },
      404
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

  const book = getBook(bible, bookData.number);
  const bookName = language === "fr" ? bookData.names.fr : bookData.names.en;

  const chapters = book
    ? book.chapters.map((ch) => ({
        number: ch.number,
        verses: ch.verses.length,
      }))
    : Array.from({ length: bookData.chapters }, (_, i) => ({
        number: i + 1,
        verses: 0,
      }));

  const response: ChaptersResponse = {
    book: { id: bookData.id, name: bookName },
    language,
    chapters,
  };

  return c.json(response);
});

books.get("/:id/chapters/:chapter", async (c) => {
  const id = c.req.param("id");
  const chapterNum = parseInt(c.req.param("chapter"), 10);
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");

  const bookData = getBookByIdOrAlias(id);

  if (!bookData) {
    return c.json(
      {
        error: {
          code: "BOOK_NOT_FOUND",
          message: `Book '${id}' not found`,
        },
      },
      404
    );
  }

  if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > bookData.chapters) {
    return c.json(
      {
        error: {
          code: "CHAPTER_NOT_FOUND",
          message: `Chapter ${chapterNum} not found in ${bookData.names.en}`,
        },
      },
      404
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

  const book = getBook(bible, bookData.number);
  if (!book) {
    return c.json(
      {
        error: {
          code: "BOOK_NOT_FOUND",
          message: `Book data not found in translation`,
        },
      },
      404
    );
  }

  const chapter = book.chapters.find((ch) => ch.number === chapterNum);
  if (!chapter) {
    return c.json(
      {
        error: {
          code: "CHAPTER_NOT_FOUND",
          message: `Chapter ${chapterNum} not found`,
        },
      },
      404
    );
  }

  const bookName = language === "fr" ? bookData.names.fr : bookData.names.en;

  const response: ChapterResponse = {
    translation: translation.id,
    language,
    book: { id: bookData.id, name: bookName },
    chapter: chapterNum,
    verses: chapter.verses.map((v) => ({
      number: v.number,
      text: v.text,
    })),
  };

  return c.json(response);
});

export default books;
