import { describe, test, expect } from "bun:test";
import app from "../index";

type Book = {
  id: string;
  name: string;
  testament: "old" | "new";
  chapters: number;
};

type BookListResponse = {
  translation: string;
  language: string;
  books: Book[];
};

type BookResponse = Book & {
  language?: string;
  translation?: string;
};

type ChapterSummary = {
  number: number;
  verses: number;
};

type ChaptersResponse = {
  book: Book;
  chapters: ChapterSummary[];
};

type Verse = {
  number: number;
  text: string;
};

type VersesResponse = {
  translation: string;
  book: Book;
  chapter: number;
  verses: Verse[];
  language?: string;
};

type ErrorResponse = {
  error: {
    code: string;
  };
};

const toJson = async <T>(response: Response) => response.json() as Promise<T>;

describe("Books Endpoints", () => {
  describe("GET /books", () => {
    test("returns list of 66 books with default translation", async () => {
      const res = await app.request("/books");
      expect(res.status).toBe(200);

      const data = await toJson<BookListResponse>(res);
      expect(data.translation).toBe("en-kjv");
      expect(data.language).toBe("en");
      expect(Array.isArray(data.books)).toBe(true);
      expect(data.books.length).toBe(66);
    });

    test("each book has required fields", async () => {
      const res = await app.request("/books");
      const data = await toJson<BookListResponse>(res);

      for (const book of data.books) {
        expect(book.id).toBeDefined();
        expect(typeof book.id).toBe("string");
        expect(book.name).toBeDefined();
        expect(typeof book.name).toBe("string");
        expect(book.testament).toMatch(/^(old|new)$/);
        expect(typeof book.chapters).toBe("number");
        expect(book.chapters).toBeGreaterThan(0);
      }
    });

    test("includes Genesis as first book", async () => {
      const res = await app.request("/books");
      const data = await toJson<BookListResponse>(res);

      const genesis = data.books[0]!;
      expect(genesis.id).toBe("gen");
      expect(genesis.name).toBe("Genesis");
      expect(genesis.testament).toBe("old");
      expect(genesis.chapters).toBe(50);
    });

    test("includes Revelation as last book", async () => {
      const res = await app.request("/books");
      const data = await toJson<BookListResponse>(res);

      const revelation = data.books[data.books.length - 1]!;
      expect(revelation.id).toBe("rev");
      expect(revelation.name).toBe("Revelation");
      expect(revelation.testament).toBe("new");
      expect(revelation.chapters).toBe(22);
    });

    test("returns French book names with language parameter", async () => {
      const res = await app.request("/books?language=fr");
      expect(res.status).toBe(200);

      const data = await toJson<BookListResponse>(res);
      expect(data.language).toBe("fr");

      const genesis = data.books[0]!;
      expect(genesis.name).toBe("Genèse");
    });

    test("uses specified translation", async () => {
      const res = await app.request("/books?translation=fr-lsg");
      expect(res.status).toBe(200);

      const data = await toJson<BookListResponse>(res);
      expect(data.translation).toBe("fr-lsg");
    });
  });

  describe("GET /books/:id", () => {
    test("returns book by short ID (gen)", async () => {
      const res = await app.request("/books/gen");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.id).toBe("gen");
      expect(data.name).toBe("Genesis");
      expect(data.testament).toBe("old");
      expect(data.chapters).toBe(50);
    });

    test("returns book by full name (genesis)", async () => {
      const res = await app.request("/books/genesis");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.id).toBe("gen");
      expect(data.name).toBe("Genesis");
    });

    test("returns book by alias (jhn for John)", async () => {
      const res = await app.request("/books/jhn");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.id).toBe("jhn");
      expect(data.name).toBe("John");
      expect(data.testament).toBe("new");
      expect(data.chapters).toBe(21);
    });

    test("handles numbered books (1cor alias)", async () => {
      const res = await app.request("/books/1cor");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.id).toBe("1co");
      expect(data.name).toBe("1 Corinthians");
      expect(data.testament).toBe("new");
    });

    test("handles numbered books (2sam alias)", async () => {
      const res = await app.request("/books/2sam");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.id).toBe("2sa");
      expect(data.name).toBe("2 Samuel");
      expect(data.testament).toBe("old");
    });

    test("returns French name with language parameter", async () => {
      const res = await app.request("/books/gen?language=fr");
      expect(res.status).toBe(200);

      const data = await toJson<BookResponse>(res);
      expect(data.name).toBe("Genèse");
      expect(data.language).toBe("fr");
    });

    test("returns BOOK_NOT_FOUND for invalid book ID", async () => {
      const res = await app.request("/books/invalid");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("BOOK_NOT_FOUND");
    });

    test("trailing slash on /books/ returns 404", async () => {
      const res = await app.request("/books/");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /books/:id/chapters", () => {
    test("returns list of chapters for Genesis", async () => {
      const res = await app.request("/books/gen/chapters");
      expect(res.status).toBe(200);

      const data = await toJson<ChaptersResponse>(res);
      expect(data.book.id).toBe("gen");
      expect(data.book.name).toBe("Genesis");
      expect(Array.isArray(data.chapters)).toBe(true);
      expect(data.chapters.length).toBe(50);
    });

    test("each chapter has number and verse count", async () => {
      const res = await app.request("/books/gen/chapters");
      const data = await toJson<ChaptersResponse>(res);

      for (const chapter of data.chapters) {
        expect(typeof chapter.number).toBe("number");
        expect(chapter.number).toBeGreaterThan(0);
        expect(typeof chapter.verses).toBe("number");
        expect(chapter.verses).toBeGreaterThan(0);
      }
    });

    test("Genesis chapter 1 has 31 verses", async () => {
      const res = await app.request("/books/gen/chapters");
      const data = await toJson<ChaptersResponse>(res);

      const chapter1 = data.chapters.find((c) => c.number === 1)!;
      expect(chapter1).toBeDefined();
      expect(chapter1.verses).toBe(31);
    });

    test("Psalm has 150 chapters", async () => {
      const res = await app.request("/books/psa/chapters");
      expect(res.status).toBe(200);

      const data = await toJson<ChaptersResponse>(res);
      expect(data.chapters.length).toBe(150);
    });

    test("returns BOOK_NOT_FOUND for invalid book", async () => {
      const res = await app.request("/books/invalid/chapters");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("BOOK_NOT_FOUND");
    });
  });

  describe("GET /books/:id/chapters/:chapter", () => {
    test("returns all verses for Genesis chapter 1", async () => {
      const res = await app.request("/books/gen/chapters/1");
      expect(res.status).toBe(200);

      const data = await toJson<VersesResponse>(res);
      expect(data.translation).toBe("en-kjv");
      expect(data.book.id).toBe("gen");
      expect(data.book.name).toBe("Genesis");
      expect(data.chapter).toBe(1);
      expect(Array.isArray(data.verses)).toBe(true);
      expect(data.verses.length).toBe(31);
    });

    test("each verse has number and text", async () => {
      const res = await app.request("/books/gen/chapters/1");
      const data = await toJson<VersesResponse>(res);

      for (const verse of data.verses) {
        expect(typeof verse.number).toBe("number");
        expect(verse.number).toBeGreaterThan(0);
        expect(typeof verse.text).toBe("string");
        expect(verse.text.length).toBeGreaterThan(0);
      }
    });

    test("Genesis 1:1 contains 'In the beginning'", async () => {
      const res = await app.request("/books/gen/chapters/1");
      const data = await toJson<VersesResponse>(res);

      const verse1 = data.verses.find((v) => v.number === 1)!;
      expect(verse1).toBeDefined();
      expect(verse1.text).toContain("In the beginning");
    });

    test("uses specified translation", async () => {
      const res = await app.request("/books/gen/chapters/1?translation=en-niv");
      expect(res.status).toBe(200);

      const data = await toJson<VersesResponse>(res);
      expect(data.translation).toBe("en-niv");
    });

    test("returns French book name with language parameter", async () => {
      const res = await app.request("/books/gen/chapters/1?language=fr");
      expect(res.status).toBe(200);

      const data = await toJson<VersesResponse>(res);
      expect(data.book.name).toBe("Genèse");
    });

    test("returns BOOK_NOT_FOUND for invalid book", async () => {
      const res = await app.request("/books/invalid/chapters/1");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("BOOK_NOT_FOUND");
    });

    test("returns CHAPTER_NOT_FOUND for chapter 0", async () => {
      const res = await app.request("/books/gen/chapters/0");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("CHAPTER_NOT_FOUND");
    });

    test("returns CHAPTER_NOT_FOUND for chapter beyond book length", async () => {
      const res = await app.request("/books/gen/chapters/999");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("CHAPTER_NOT_FOUND");
    });

    test("returns CHAPTER_NOT_FOUND for negative chapter", async () => {
      const res = await app.request("/books/gen/chapters/-1");
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("CHAPTER_NOT_FOUND");
    });

    test("returns TRANSLATION_NOT_FOUND for invalid translation", async () => {
      const res = await app.request(
        "/books/gen/chapters/1?translation=invalid"
      );
      expect(res.status).toBe(404);

      const data = await toJson<ErrorResponse>(res);
      expect(data.error.code).toBe("TRANSLATION_NOT_FOUND");
    });
  });
});
