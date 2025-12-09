import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import languages from "./src/routes/languages";
import translations from "./src/routes/translations";
import books from "./src/routes/books";
import verses from "./src/routes/verses";
import search from "./src/routes/search";

const app = new OpenAPIHono();

app.use("/*", cors());
app.route("/languages", languages);
app.route("/translations", translations);
app.route("/books", books);
app.route("/verses", verses);
app.route("/search", search);

app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Bible API",
    version: "1.0.0",
    description:
      "A RESTful API for accessing Bible verses, books, chapters, and translations. Supports multiple languages and translations with search functionality.",
    contact: {
      name: "Bible API",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    {
      name: "Languages",
      description: "Endpoints for retrieving available languages",
    },
    {
      name: "Translations",
      description: "Endpoints for retrieving Bible translations",
    },
    {
      name: "Books",
      description: "Endpoints for retrieving Bible books and chapters",
    },
    {
      name: "Verses",
      description: "Endpoints for retrieving and comparing Bible verses",
    },
    {
      name: "Search",
      description: "Endpoints for searching Bible content",
    },
  ],
});

app.get(
  "/",
  Scalar({
    url: "/openapi.json",
    theme: "default",
    pageTitle: "Bible API Documentation",
  })
);

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
