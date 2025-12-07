import { describe, test, expect } from "bun:test";
import app from "../index";

describe("Translations Endpoint", () => {
  describe("GET /translations", () => {
    test("returns list of all translations", async () => {
      const res = await app.request("/translations");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.default).toBe("en-kjv");
      expect(Array.isArray(data.translations)).toBe(true);
      expect(data.translations.length).toBeGreaterThan(0);
    });

    test("includes KJV translation with correct details", async () => {
      const res = await app.request("/translations");
      const data = await res.json();

      const kjv = data.translations.find((t) => t.id === "en-kjv");
      expect(kjv).toBeDefined();
      expect(kjv.language).toBe("en");
      expect(kjv.name).toBeDefined();
    });

    test("each translation has required fields", async () => {
      const res = await app.request("/translations");
      const data = await res.json();

      for (const translation of data.translations) {
        expect(translation.id).toBeDefined();
        expect(typeof translation.id).toBe("string");
        expect(translation.name).toBeDefined();
        expect(typeof translation.name).toBe("string");
        expect(translation.language).toBeDefined();
        expect(typeof translation.language).toBe("string");
        expect(translation.status).toBeDefined();
      }
    });
  });

  describe("GET /translations with language filter", () => {
    test("filters translations by English language", async () => {
      const res = await app.request("/translations?language=en");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.language).toBe("en");
      expect(Array.isArray(data.translations)).toBe(true);

      for (const translation of data.translations) {
        expect(translation.language).toBe("en");
      }
    });

    test("filters translations by French language", async () => {
      const res = await app.request("/translations?language=fr");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.language).toBe("fr");
      expect(Array.isArray(data.translations)).toBe(true);

      for (const translation of data.translations) {
        expect(translation.language).toBe("fr");
      }
    });

    test("returns empty array for non-existent language", async () => {
      const res = await app.request("/translations?language=xx");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.language).toBe("xx");
      expect(Array.isArray(data.translations)).toBe(true);
      expect(data.translations.length).toBe(0);
    });
  });
});
