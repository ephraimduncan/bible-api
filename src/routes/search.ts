import { Hono } from "hono";
import {
  getDefaultTranslation,
  getTranslationMeta,
} from "../services/bible-loader";
import { searchVerses } from "../services/database";
import { getBookByNumber, DEFAULT_LANGUAGE } from "../data/books";
import type { SearchResponse, SearchResult } from "../types/bible";

const search = new Hono();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string): string {
  const escaped = escapeRegex(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<em>$1</em>");
}

search.get("/", async (c) => {
  const query = c.req.query("q");
  const language = c.req.query("language") || DEFAULT_LANGUAGE;
  const translationId = c.req.query("translation");
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");

  if (!query) {
    return c.json(
      {
        error: {
          code: "MISSING_QUERY",
          message: "Missing q query parameter",
        },
      },
      400
    );
  }

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 10;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const translation = translationId
    ? await getTranslationMeta(translationId)
    : await getDefaultTranslation(language);

  if (!translation) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translationId ?? language}' not found`,
        },
      },
      404
    );
  }

  const { results: dbResults, total } = searchVerses(
    translation.id,
    query,
    limit,
    offset
  );

  const results: SearchResult[] = dbResults.map((row) => {
    const bookData = getBookByNumber(row.book);
    const bookName = bookData
      ? language === "fr"
        ? bookData.names.fr
        : bookData.names.en
      : `Book ${row.book}`;

    return {
      reference: `${bookName} ${row.chapter}:${row.verse}`,
      text: row.text,
      highlight: highlightMatches(row.text, query),
    };
  });

  const response: SearchResponse = {
    query,
    translation: translation.id,
    language,
    total,
    limit,
    offset,
    results,
  };

  return c.json(response);
});

export default search;
