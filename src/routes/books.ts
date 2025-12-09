import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { BOOKS, getBookByIdOrAlias, DEFAULT_TRANSLATION } from "../data/books";
import {
  getTranslationMeta,
  getBookChaptersFromDb,
  getChapterVersesFromDb,
} from "../services/bible-loader";
import {
  TranslationOnlyQuerySchema,
  BookIdParamSchema,
  ChapterParamSchema,
  BooksResponseSchema,
  BookResponseSchema,
  ChaptersResponseSchema,
  ChapterResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const books = new OpenAPIHono();

const getBooksRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Books"],
  summary: "List all books",
  description: "Get a list of all books in the Bible with chapter counts",
  request: {
    query: TranslationOnlyQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BooksResponseSchema,
        },
      },
      description: "List of all Bible books",
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

books.openapi(getBooksRoute, async (c) => {
  const { translation: translationId } = c.req.valid("query");

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

  return c.json(
    {
      translation: translation.id,
      books: BOOKS.map((book) => ({
        id: book.id,
        name: book.names.en,
        testament: book.testament,
        chapters: book.chapters,
      })),
    },
    200
  );
});

const getBookRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Books"],
  summary: "Get a book",
  description: "Get information about a specific book by ID or alias",
  request: {
    params: BookIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: BookResponseSchema,
        },
      },
      description: "Book information",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Book not found",
    },
  },
});

books.openapi(getBookRoute, async (c) => {
  const { id } = c.req.valid("param");

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

  return c.json(
    {
      id: book.id,
      name: book.names.en,
      testament: book.testament,
      chapters: book.chapters,
    },
    200
  );
});

const getChaptersRoute = createRoute({
  method: "get",
  path: "/{id}/chapters",
  tags: ["Books"],
  summary: "List chapters in a book",
  description: "Get a list of all chapters in a book with verse counts",
  request: {
    params: BookIdParamSchema,
    query: TranslationOnlyQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChaptersResponseSchema,
        },
      },
      description: "List of chapters",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Book or translation not found",
    },
  },
});

books.openapi(getChaptersRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { translation: translationId } = c.req.valid("query");

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

  const chapters = getBookChaptersFromDb(translation.id, bookData.number);

  return c.json(
    {
      book: { id: bookData.id, name: bookData.names.en },
      chapters,
    },
    200
  );
});

const getChapterRoute = createRoute({
  method: "get",
  path: "/{id}/chapters/{chapter}",
  tags: ["Books"],
  summary: "Get a chapter",
  description: "Get all verses in a specific chapter",
  request: {
    params: ChapterParamSchema,
    query: TranslationOnlyQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ChapterResponseSchema,
        },
      },
      description: "Chapter with all verses",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Book, chapter, or translation not found",
    },
  },
});

books.openapi(getChapterRoute, async (c) => {
  const { id, chapter } = c.req.valid("param");
  const chapterNum = parseInt(chapter, 10);
  const { translation: translationId } = c.req.valid("query");

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

  if (
    Number.isNaN(chapterNum) ||
    chapterNum < 1 ||
    chapterNum > bookData.chapters
  ) {
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

  const verses = getChapterVersesFromDb(
    translation.id,
    bookData.number,
    chapterNum
  );

  if (verses.length === 0) {
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

  return c.json(
    {
      translation: translation.id,
      book: { id: bookData.id, name: bookData.names.en },
      chapter: chapterNum,
      verses: verses.map((v) => ({
        number: v.number,
        text: v.text,
      })),
    },
    200
  );
});

export default books;
