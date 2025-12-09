import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { discoverTranslations } from "../services/bible-loader";
import { DEFAULT_TRANSLATION } from "../data/books";
import {
  TranslationsResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const translations = new OpenAPIHono();

const getTranslationsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Translations"],
  summary: "List available translations",
  description: "Get a list of all available Bible translations",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: TranslationsResponseSchema,
        },
      },
      description: "List of available translations",
    },
    500: {
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
      description: "Internal server error",
    },
  },
});

translations.openapi(getTranslationsRoute, async (c) => {
  const translationList = await discoverTranslations();

  return c.json(
    {
      default: DEFAULT_TRANSLATION,
      translations: translationList.map((t) => {
        const isDefault = t.id === DEFAULT_TRANSLATION;
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          ...(isDefault && { default: true }),
        };
      }),
    },
    200
  );
});

export default translations;
