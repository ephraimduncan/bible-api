import { describe, test, expect } from "bun:test";
import app from "../index";

describe("Root Endpoint", () => {
  describe("GET /", () => {
    test("returns API information", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.name).toBe("Bible API");
      expect(data.version).toBe("1.0.0");
      expect(data.endpoints).toBeDefined();
      expect(data.defaults).toBeDefined();
    });

    test("includes all endpoint documentation", async () => {
      const res = await app.request("/");
      const data = await res.json();

      expect(data.endpoints.languages).toBe("GET /languages");
      expect(data.endpoints.translations).toBe("GET /translations");
      expect(data.endpoints.books).toBe("GET /books");
      expect(data.endpoints.book).toBe("GET /books/:id");
      expect(data.endpoints.chapters).toBe("GET /books/:id/chapters");
      expect(data.endpoints.chapter).toBe("GET /books/:id/chapters/:num");
      expect(data.endpoints.verse).toBe("GET /verses/:ref");
      expect(data.endpoints.multipleVerses).toBe("GET /verses?refs=...");
      expect(data.endpoints.compare).toBe("GET /verses/:ref/compare");
      expect(data.endpoints.search).toBe("GET /search?q=...");
    });

    test("includes default language and translation", async () => {
      const res = await app.request("/");
      const data = await res.json();

      expect(data.defaults.language).toBe("en");
      expect(data.defaults.translation).toBe("en-kjv");
    });
  });

  describe("404 Not Found", () => {
    test("returns NOT_FOUND for invalid endpoints", async () => {
      const res = await app.request("/invalid-endpoint");
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Endpoint not found");
    });

    test("returns NOT_FOUND for nested invalid paths", async () => {
      const res = await app.request("/some/deep/invalid/path");
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });
});
