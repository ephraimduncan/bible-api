import { describe, test, expect } from "bun:test";
import app from "../index";

interface Translation {
  id: string;
  name: string;
  status: string;
  default?: boolean;
}

interface TranslationsResponse {
  default: string;
  translations: Translation[];
}

describe("Translations Endpoint", () => {
  describe("GET /translations", () => {
    test("returns list of all translations", async () => {
      const res = await app.request("/translations");
      expect(res.status).toBe(200);

      const data = (await res.json()) as TranslationsResponse;
      expect(data.default).toBe("englishkj");
      expect(Array.isArray(data.translations)).toBe(true);
      expect(data.translations.length).toBeGreaterThan(0);
    });

    test("includes KJV translation with correct details", async () => {
      const res = await app.request("/translations");
      const data = (await res.json()) as TranslationsResponse;

      const kjv = data.translations.find((t) => t.id === "englishkj");
      expect(kjv).toBeDefined();
      expect(kjv!.name).toBeDefined();
    });

    test("each translation has required fields", async () => {
      const res = await app.request("/translations");
      const data = (await res.json()) as TranslationsResponse;

      for (const translation of data.translations) {
        expect(translation.id).toBeDefined();
        expect(typeof translation.id).toBe("string");
        expect(translation.name).toBeDefined();
        expect(typeof translation.name).toBe("string");
        expect(translation.status).toBeDefined();
      }
    });
  });
});
