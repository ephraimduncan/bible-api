import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  getDefaultTranslation,
  getTranslationMeta,
} from "../services/bible-loader";
import { searchVerses } from "../services/database";
import { getBookByNumber, DEFAULT_LANGUAGE } from "../data/books";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const search = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const issues = result.error.issues;
      const isMissingQ = issues.some(
        (i) => i.path[0] === "q" && i.code === "too_small"
      );
      const isInvalidType = issues.some(
        (i) => i.path[0] === "q" && i.code === "invalid_type"
      );

      if (isMissingQ || isInvalidType) {
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

      return c.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: result.error.message,
          },
        },
        400
      );
    }
  },
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatches(text: string, query: string): string {
  const escaped = escapeRegex(query);
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<em>$1</em>");
}

const searchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Search verses",
  description:
    "Search for verses containing a specific query string with highlighted results",
  request: {
    query: SearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: SearchResponseSchema,
        },
      },
      description: "Search results with highlighted matches",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Missing or invalid query parameter",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Translation not found",
    },
  },
});

search.openapi(searchRoute, async (c) => {
  const {
    q: query,
    language: langParam,
    translation: translationId,
    limit: limitStr,
    offset: offsetStr,
  } = c.req.valid("query");

  const language = langParam ?? DEFAULT_LANGUAGE;
  const limit = Math.min(limitStr ? parseInt(limitStr, 10) : 10, 100);
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

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

  const results = dbResults.map((row) => {
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

  return c.json(
    {
      query,
      translation: translation.id,
      language,
      total,
      limit,
      offset,
      results,
    },
    200
  );
});

export default search;
