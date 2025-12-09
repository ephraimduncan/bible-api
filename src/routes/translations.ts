import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  discoverTranslations,
  getTranslationsByLanguage,
} from "../services/bible-loader";
import { DEFAULT_TRANSLATION } from "../data/books";
import {
  LanguageQuerySchema,
  TranslationsResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const translations = new OpenAPIHono();

const getTranslationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Translations"],
  summary: "List available translations",
  description:
    "Get a list of all available Bible translations, optionally filtered by language",
  request: {
    query: LanguageQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TranslationsResponseSchema,
        },
      },
      description: "List of available translations",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Invalid query parameters",
    },
  },
});

translations.openapi(getTranslationsRoute, async (c) => {
  const { language } = c.req.valid("query");

  let translationList = await discoverTranslations();

  if (language) {
    translationList = await getTranslationsByLanguage(language);
  }

  return c.json({
    default: DEFAULT_TRANSLATION,
    ...(language && { language }),
    translations: translationList.map((t) => {
      const isDefault = t.id === DEFAULT_TRANSLATION;
      return {
        id: t.id,
        name: t.name,
        language: t.language,
        status: t.status,
        ...(isDefault && { default: true }),
      };
    }),
  });
});

export default translations;
