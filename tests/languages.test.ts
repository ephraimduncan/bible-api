import { describe, test, expect } from "bun:test";
import app from "../index";

describe("Languages Endpoint", () => {
  describe("GET /languages", () => {
    test("returns list of available languages", async () => {
      const res = await app.request("/languages");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.default).toBe("en");
      expect(Array.isArray(data.languages)).toBe(true);
      expect(data.languages.length).toBeGreaterThan(0);
    });

    test("includes English language with correct details", async () => {
      const res = await app.request("/languages");
      const data = await res.json();

      const english = data.languages.find((lang) => lang.code === "en");
      expect(english).toBeDefined();
      expect(english.name).toBe("English");
      expect(english.native_name).toBe("English");
    });

    test("includes French language with correct details", async () => {
      const res = await app.request("/languages");
      const data = await res.json();

      const french = data.languages.find((lang) => lang.code === "fr");
      expect(french).toBeDefined();
      expect(french.name).toBe("French");
      expect(french.native_name).toBe("Français");
    });

    test("each language has required fields", async () => {
      const res = await app.request("/languages");
      const data = await res.json();

      for (const lang of data.languages) {
        expect(lang.code).toBeDefined();
        expect(typeof lang.code).toBe("string");
        expect(lang.name).toBeDefined();
        expect(typeof lang.name).toBe("string");
        expect(lang.native_name).toBeDefined();
        expect(typeof lang.native_name).toBe("string");
      }
    });
  });
});
