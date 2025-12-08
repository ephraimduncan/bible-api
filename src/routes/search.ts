import { Hono } from "hono";
import {
  getDefaultTranslation,
  getTranslationMeta,
} from "../services/bible-loader";
import { searchVerses } from "../services/database";
import { getBookByNumber, DEFAULT_LANGUAGE } from "../data/books";
import {
  SearchQuerySchema,
  type SearchResponse,
  type SearchResult,
} from "../schemas";

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
  const parsedQuery = SearchQuerySchema.safeParse(c.req.query());

  if (!parsedQuery.success) {
    const missingQuery = parsedQuery.error.issues.some(
      (issue) => issue.path[0] === "q"
    );

    return c.json(
      {
        error: {
          code: missingQuery ? "MISSING_QUERY" : "INVALID_QUERY",
          message: missingQuery
            ? "Missing q query parameter"
            : parsedQuery.error.message,
        },
      },
      400
    );
  }

  const {
    q: query,
    language: langParam,
    translation: translationId,
    limit,
    offset,
  } = parsedQuery.data;
  const language = langParam ?? DEFAULT_LANGUAGE;

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
