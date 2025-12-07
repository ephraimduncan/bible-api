import { describe, test, expect } from "bun:test";
import app from "../index";

describe("Search Endpoint", () => {
  describe("GET /search", () => {
    test("finds verses containing 'beginning'", async () => {
      const res = await app.request("/search?q=beginning");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.query).toBe("beginning");
      expect(data.translation).toBe("en-kjv");
      expect(data.language).toBe("en");
      expect(typeof data.total).toBe("number");
      expect(data.total).toBeGreaterThan(0);
      expect(Array.isArray(data.results)).toBe(true);
    });

    test("Genesis 1:1 appears in results for 'In the beginning'", async () => {
      const res = await app.request("/search?q=In the beginning");
      const data = await res.json();

      const genesis = data.results.find((r) =>
        r.reference.includes("Genesis 1:1")
      );
      expect(genesis).toBeDefined();
    });

    test("each result has required fields", async () => {
      const res = await app.request("/search?q=love");
      const data = await res.json();

      for (const result of data.results) {
        expect(result.reference).toBeDefined();
        expect(typeof result.reference).toBe("string");
        expect(result.text).toBeDefined();
        expect(typeof result.text).toBe("string");
        expect(result.highlight).toBeDefined();
        expect(typeof result.highlight).toBe("string");
      }
    });

    test("results include highlighted matches with <em> tags", async () => {
      const res = await app.request("/search?q=love");
      const data = await res.json();

      const hasHighlight = data.results.some((r) =>
        r.highlight.includes("<em>")
      );
      expect(hasHighlight).toBe(true);
    });

    test("highlights are case-insensitive", async () => {
      const res = await app.request("/search?q=LORD");
      const data = await res.json();

      expect(data.results.length).toBeGreaterThan(0);
    });
  });

  describe("pagination", () => {
    test("respects limit parameter", async () => {
      const res = await app.request("/search?q=the&limit=5");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.limit).toBe(5);
      expect(data.results.length).toBeLessThanOrEqual(5);
    });

    test("respects offset parameter", async () => {
      const res = await app.request("/search?q=the&limit=5&offset=10");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.offset).toBe(10);
    });

    test("default limit is 10", async () => {
      const res = await app.request("/search?q=the");
      const data = await res.json();

      expect(data.limit).toBe(10);
      expect(data.results.length).toBeLessThanOrEqual(10);
    });

    test("default offset is 0", async () => {
      const res = await app.request("/search?q=the");
      const data = await res.json();

      expect(data.offset).toBe(0);
    });

    test("caps limit at 100", async () => {
      const res = await app.request("/search?q=the&limit=200");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.limit).toBe(100);
    });

    test("pagination returns different results", async () => {
      const page1 = await app.request("/search?q=the&limit=5&offset=0");
      const page2 = await app.request("/search?q=the&limit=5&offset=5");

      const data1 = await page1.json();
      const data2 = await page2.json();

      expect(data1.results.length).toBeGreaterThan(0);
      expect(data2.results.length).toBeGreaterThan(0);
      expect(data1.results[0].reference).not.toBe(data2.results[0].reference);
    });

    test("total count is accurate regardless of pagination", async () => {
      const page1 = await app.request("/search?q=love&limit=5&offset=0");
      const page2 = await app.request("/search?q=love&limit=5&offset=5");

      const data1 = await page1.json();
      const data2 = await page2.json();

      expect(data1.total).toBe(data2.total);
    });
  });

  describe("language and translation filters", () => {
    test("uses specified language", async () => {
      const res = await app.request("/search?q=amour&language=fr");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.language).toBe("fr");
    });

    test("French search returns French book names", async () => {
      const res = await app.request("/search?q=commencement&language=fr");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.results.length).toBeGreaterThan(0);

      const hasFrenchRef = data.results.some(
        (r) => r.reference.includes("Genèse") || r.reference.includes("Jean")
      );
      expect(hasFrenchRef).toBe(true);
      expect(data.language).toBe("fr");
    });

    test("uses specified translation", async () => {
      const res = await app.request("/search?q=beginning&translation=en-niv");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.translation).toBe("en-niv");
    });

    test("returns TRANSLATION_NOT_FOUND for invalid translation", async () => {
      const res = await app.request("/search?q=test&translation=invalid");
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe("TRANSLATION_NOT_FOUND");
    });
  });

  describe("error cases", () => {
    test("returns MISSING_QUERY when q parameter is absent", async () => {
      const res = await app.request("/search");
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe("MISSING_QUERY");
      expect(data.error.message).toBe("Missing q query parameter");
    });

    test("returns MISSING_QUERY when q parameter is empty", async () => {
      const res = await app.request("/search?q=");
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe("MISSING_QUERY");
    });

    test("handles special regex characters in query", async () => {
      const res = await app.request("/search?q=.*");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.query).toBe(".*");
    });

    test("handles query with only spaces", async () => {
      const res = await app.request("/search?q=%20%20%20");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.query).toBe("   ");
    });
  });

  describe("search content", () => {
    test("searches through both Old and New Testament", async () => {
      const res = await app.request("/search?q=God&limit=100");
      const data = await res.json();

      expect(data.total).toBeGreaterThan(0);
    });

    test("search is case-insensitive", async () => {
      const lowercase = await app.request("/search?q=jesus");
      const uppercase = await app.request("/search?q=JESUS");
      const mixed = await app.request("/search?q=Jesus");

      const lowData = await lowercase.json();
      const upData = await uppercase.json();
      const mixedData = await mixed.json();

      expect(lowData.total).toBeGreaterThan(0);
      expect(upData.total).toBeGreaterThan(0);
      expect(mixedData.total).toBeGreaterThan(0);
    });

    test("finds partial word matches", async () => {
      const res = await app.request("/search?q=creat");
      const data = await res.json();

      expect(data.total).toBeGreaterThan(0);
    });

    test("finds multi-word phrases", async () => {
      const res = await app.request("/search?q=the Lord is");
      const data = await res.json();

      expect(data.total).toBeGreaterThan(0);
      for (const result of data.results) {
        expect(result.text.toLowerCase()).toContain("the lord is");
      }
    });
  });
});
