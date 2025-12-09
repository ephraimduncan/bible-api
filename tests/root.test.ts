import { describe, test, expect } from "bun:test";
import app from "../index";

describe("Root Endpoint", () => {
  describe("GET /", () => {
    test("returns Scalar API documentation", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("Bible API Documentation");
    });
  });

  describe("GET /openapi.json", () => {
    test("returns OpenAPI specification", async () => {
      const res = await app.request("/openapi.json");
      expect(res.status).toBe(200);

      const data = (await res.json()) as {
        openapi: string;
        info: { title: string; version: string };
        paths: Record<string, unknown>;
        tags: Array<{ name: string }>;
      };
      expect(data.openapi).toBe("3.1.0");
      expect(data.info.title).toBe("Bible API");
      expect(data.info.version).toBe("1.0.0");
    });

    test("includes all API paths", async () => {
      const res = await app.request("/openapi.json");
      const data = (await res.json()) as { paths: Record<string, unknown> };

      expect(data.paths["/translations"]).toBeDefined();
      expect(data.paths["/books"]).toBeDefined();
      expect(data.paths["/books/{id}"]).toBeDefined();
      expect(data.paths["/books/{id}/chapters"]).toBeDefined();
      expect(data.paths["/books/{id}/chapters/{chapter}"]).toBeDefined();
      expect(data.paths["/verses"]).toBeDefined();
      expect(data.paths["/verses/{ref}"]).toBeDefined();
      expect(data.paths["/verses/{ref}/compare"]).toBeDefined();
      expect(data.paths["/search"]).toBeDefined();
    });

    test("includes all tags", async () => {
      const res = await app.request("/openapi.json");
      const data = (await res.json()) as { tags: Array<{ name: string }> };

      const tagNames = data.tags.map((t) => t.name);
      expect(tagNames).toContain("Translations");
      expect(tagNames).toContain("Books");
      expect(tagNames).toContain("Verses");
      expect(tagNames).toContain("Search");
    });
  });

  describe("404 Not Found", () => {
    test("returns NOT_FOUND for invalid endpoints", async () => {
      const res = await app.request("/invalid-endpoint");
      expect(res.status).toBe(404);

      const data = (await res.json()) as { error: { code: string; message: string } };
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Endpoint not found");
    });

    test("returns NOT_FOUND for nested invalid paths", async () => {
      const res = await app.request("/some/deep/invalid/path");
      expect(res.status).toBe(404);

      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });
});
