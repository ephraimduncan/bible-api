import { Hono } from "hono";
import { cors } from "hono/cors";
import languages from "./src/routes/languages";
import translations from "./src/routes/translations";
import books from "./src/routes/books";
import verses from "./src/routes/verses";
import search from "./src/routes/search";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => {
  return c.json({
    name: "Bible API",
    version: "1.0.0",
    endpoints: {
      languages: "GET /languages",
      translations: "GET /translations",
      books: "GET /books",
      book: "GET /books/:id",
      chapters: "GET /books/:id/chapters",
      chapter: "GET /books/:id/chapters/:num",
      verse: "GET /verses/:ref",
      multipleVerses: "GET /verses?refs=...",
      compare: "GET /verses/:ref/compare",
      search: "GET /search?q=...",
    },
    defaults: {
      language: "en",
      translation: "en-kjv",
    },
  });
});

app.route("/languages", languages);
app.route("/translations", translations);
app.route("/books", books);
app.route("/verses", verses);
app.route("/search", search);

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found",
      },
    },
    404
  );
});

app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred",
      },
    },
    500
  );
});

export default app;
