import { Hono } from "hono";
import {
  loadTranslation,
  getDefaultTranslation,
  getTranslationMeta,
} from "../services/bible-loader";
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

  const bible = await loadTranslation(translation.id);
  if (!bible) {
    return c.json(
      {
        error: {
          code: "TRANSLATION_NOT_FOUND",
          message: `Translation '${translation.id}' could not be loaded`,
        },
      },
      500
    );
  }

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search through Old Testament
  for (const book of bible.testaments.old) {
    const bookData = getBookByNumber(book.number);
    if (!bookData) continue;

    const bookName = language === "fr" ? bookData.names.fr : bookData.names.en;

    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        if (verse.text.toLowerCase().includes(lowerQuery)) {
          results.push({
            reference: `${bookName} ${chapter.number}:${verse.number}`,
            text: verse.text,
            highlight: highlightMatches(verse.text, query),
          });
        }
      }
    }
  }

  // Search through New Testament
  for (const book of bible.testaments.new) {
    const bookData = getBookByNumber(book.number);
    if (!bookData) continue;

    const bookName = language === "fr" ? bookData.names.fr : bookData.names.en;

    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        if (verse.text.toLowerCase().includes(lowerQuery)) {
          results.push({
            reference: `${bookName} ${chapter.number}:${verse.number}`,
            text: verse.text,
            highlight: highlightMatches(verse.text, query),
          });
        }
      }
    }
  }

  const total = results.length;
  const paginatedResults = results.slice(offset, offset + limit);

  const response: SearchResponse = {
    query,
    translation: translation.id,
    language,
    total,
    limit,
    offset,
    results: paginatedResults,
  };

  return c.json(response);
});

export default search;
