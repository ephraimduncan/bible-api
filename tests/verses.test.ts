import { describe, test, expect } from "bun:test";
import app from "../index";

interface VerseResponse {
  reference: string;
  translation: string;
  book: { id: string; name: string };
  chapter: number;
  verse: number;
  text: string;
}

interface VerseRangeResponse {
  reference: string;
  translation: string;
  book: { id: string; name: string };
  chapter: number;
  verses: Array<{ number: number; text: string }>;
}

interface MultipleVersesResponse {
  translation: string;
  verses: Array<{
    reference: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
}

interface CompareResponse {
  reference: string;
  book: { id: string };
  chapter: number;
  verse: number;
  comparisons: Array<{
    translation: string;
    translationName: string;
    bookName: string;
    text: string;
  }>;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

describe("Verses Endpoints", () => {
  describe("GET /verses/:ref (single verse)", () => {
    test("returns Genesis 1:1", async () => {
      const res = await app.request("/verses/gen.1.1");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseResponse;
      expect(data.reference).toBe("Genesis 1:1");
      expect(data.translation).toBe("englishkj");
      expect(data.book.id).toBe("gen");
      expect(data.book.name).toBe("Genesis");
      expect(data.chapter).toBe(1);
      expect(data.verse).toBe(1);
      expect(data.text).toContain("In the beginning");
    });

    test("returns John 3:16", async () => {
      const res = await app.request("/verses/jhn.3.16");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseResponse;
      expect(data.reference).toBe("John 3:16");
      expect(data.book.id).toBe("jhn");
      expect(data.chapter).toBe(3);
      expect(data.verse).toBe(16);
      expect(data.text).toContain("God so loved");
    });

    test("handles case-insensitive book IDs", async () => {
      const res = await app.request("/verses/GEN.1.1");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseResponse;
      expect(data.book.id).toBe("gen");
    });

    test("uses specified translation", async () => {
      const res = await app.request("/verses/gen.1.1?translation=englishniv");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseResponse;
      expect(data.translation).toBe("englishniv");
    });

    test("returns INVALID_REFERENCE for malformed format", async () => {
      const res = await app.request("/verses/invalid");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("returns INVALID_REFERENCE for missing chapter", async () => {
      const res = await app.request("/verses/gen.1");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("returns INVALID_REFERENCE for missing verse", async () => {
      const res = await app.request("/verses/gen");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("returns INVALID_REFERENCE for unknown book", async () => {
      const res = await app.request("/verses/xyz.1.1");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
      expect(data.error.message).toContain("Unknown book");
    });

    test("returns INVALID_REFERENCE for invalid chapter number", async () => {
      const res = await app.request("/verses/gen.999.1");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
      expect(data.error.message).toContain("Invalid chapter");
    });

    test("returns CHAPTER_NOT_FOUND for chapter 0", async () => {
      const res = await app.request("/verses/gen.0.1");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("returns VERSE_NOT_FOUND for non-existent verse", async () => {
      const res = await app.request("/verses/gen.1.999");
      expect(res.status).toBe(404);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("VERSE_NOT_FOUND");
    });

    test("returns TRANSLATION_NOT_FOUND for invalid translation", async () => {
      const res = await app.request("/verses/gen.1.1?translation=invalid");
      expect(res.status).toBe(404);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("TRANSLATION_NOT_FOUND");
    });
  });

  describe("GET /verses/:ref (verse range)", () => {
    test("returns Psalm 23:1-6", async () => {
      const res = await app.request("/verses/psa.23.1-6");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseRangeResponse;
      expect(data.reference).toBe("Psalms 23:1-6");
      expect(data.book.id).toBe("psa");
      expect(data.chapter).toBe(23);
      expect(Array.isArray(data.verses)).toBe(true);
      expect(data.verses.length).toBe(6);
    });

    test("verse range includes correct verse numbers", async () => {
      const res = await app.request("/verses/psa.23.1-3");
      const data = (await res.json()) as VerseRangeResponse;

      expect(data.verses[0].number).toBe(1);
      expect(data.verses[1].number).toBe(2);
      expect(data.verses[2].number).toBe(3);
    });

    test("each verse in range has text", async () => {
      const res = await app.request("/verses/psa.23.1-6");
      const data = (await res.json()) as VerseRangeResponse;

      for (const verse of data.verses) {
        expect(typeof verse.number).toBe("number");
        expect(typeof verse.text).toBe("string");
        expect(verse.text.length).toBeGreaterThan(0);
      }
    });

    test("Psalm 23:1 contains 'The LORD is my shepherd'", async () => {
      const res = await app.request("/verses/psa.23.1-6");
      const data = (await res.json()) as VerseRangeResponse;

      const verse1 = data.verses.find((v) => v.number === 1);
      expect(verse1!.text).toContain("LORD");
      expect(verse1!.text).toContain("shepherd");
    });

    test("returns INVALID_REFERENCE when end < start", async () => {
      const res = await app.request("/verses/psa.23.6-1");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
      expect(data.error.message).toContain("End verse must be >= start verse");
    });

    test("handles single verse notation (start equals end)", async () => {
      const res = await app.request("/verses/gen.1.1-1");
      expect(res.status).toBe(200);

      const data = (await res.json()) as VerseResponse;
      expect(data.verse).toBe(1);
    });
  });

  describe("GET /verses (multiple verses)", () => {
    test("returns multiple verses with refs parameter", async () => {
      const res = await app.request("/verses?refs=jhn.3.16,rom.8.28");
      expect(res.status).toBe(200);

      const data = (await res.json()) as MultipleVersesResponse;
      expect(data.translation).toBe("englishkj");
      expect(Array.isArray(data.verses)).toBe(true);
      expect(data.verses.length).toBe(2);
    });

    test("each verse has correct structure", async () => {
      const res = await app.request("/verses?refs=jhn.3.16,rom.8.28");
      const data = (await res.json()) as MultipleVersesResponse;

      for (const verse of data.verses) {
        expect(verse.reference).toBeDefined();
        expect(verse.book).toBeDefined();
        expect(typeof verse.chapter).toBe("number");
        expect(typeof verse.verse).toBe("number");
        expect(typeof verse.text).toBe("string");
      }
    });

    test("returns John 3:16 and Romans 8:28 correctly", async () => {
      const res = await app.request("/verses?refs=jhn.3.16,rom.8.28");
      const data = (await res.json()) as MultipleVersesResponse;

      const john = data.verses.find((v) => v.book === "John");
      expect(john).toBeDefined();
      expect(john!.chapter).toBe(3);
      expect(john!.verse).toBe(16);

      const romans = data.verses.find((v) => v.book === "Romans");
      expect(romans).toBeDefined();
      expect(romans!.chapter).toBe(8);
      expect(romans!.verse).toBe(28);
    });

    test("handles whitespace in refs parameter", async () => {
      const res = await app.request("/verses?refs=jhn.3.16, rom.8.28");
      expect(res.status).toBe(200);

      const data = (await res.json()) as MultipleVersesResponse;
      expect(data.verses.length).toBe(2);
    });

    test("returns MISSING_REFS when refs parameter is absent", async () => {
      const res = await app.request("/verses");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("MISSING_REFS");
    });

    test("returns INVALID_REFERENCE when any ref is invalid", async () => {
      const res = await app.request("/verses?refs=jhn.3.16,invalid");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("uses specified translation", async () => {
      const res = await app.request("/verses?refs=jhn.3.16&translation=englishniv");
      expect(res.status).toBe(200);

      const data = (await res.json()) as MultipleVersesResponse;
      expect(data.translation).toBe("englishniv");
    });
  });

  describe("GET /verses/:ref/compare", () => {
    test("compares verse across translations", async () => {
      const res = await app.request(
        "/verses/jhn.3.16/compare?translations=englishkj,englishniv"
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as CompareResponse;
      expect(data.reference).toBe("John 3:16");
      expect(data.book.id).toBe("jhn");
      expect(data.chapter).toBe(3);
      expect(data.verse).toBe(16);
      expect(Array.isArray(data.comparisons)).toBe(true);
    });

    test("each comparison has required fields", async () => {
      const res = await app.request(
        "/verses/jhn.3.16/compare?translations=englishkj,englishniv"
      );
      const data = (await res.json()) as CompareResponse;

      for (const comparison of data.comparisons) {
        expect(comparison.translation).toBeDefined();
        expect(comparison.translationName).toBeDefined();
        expect(comparison.bookName).toBeDefined();
        expect(comparison.text).toBeDefined();
      }
    });

    test("returns MISSING_PARAMETER when translations not provided", async () => {
      const res = await app.request("/verses/jhn.3.16/compare");
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("MISSING_PARAMETER");
      expect(data.error.message).toContain("translations query parameter is required");
    });

    test("returns INVALID_REFERENCE for malformed reference", async () => {
      const res = await app.request(
        "/verses/invalid/compare?translations=englishkj"
      );
      expect(res.status).toBe(400);

      const data = (await res.json()) as ErrorResponse;
      expect(data.error.code).toBe("INVALID_REFERENCE");
    });

    test("handles non-existent translations gracefully", async () => {
      const res = await app.request(
        "/verses/jhn.3.16/compare?translations=englishkj,nonexistent"
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as CompareResponse;
      expect(data.comparisons.length).toBeGreaterThanOrEqual(1);
    });

    test("handles whitespace in translations parameter", async () => {
      const res = await app.request(
        "/verses/jhn.3.16/compare?translations=englishkj, englishniv"
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as CompareResponse;
      expect(data.comparisons.length).toBe(2);
    });
  });
});
