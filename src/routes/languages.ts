import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { getAvailableLanguages } from "../services/bible-loader";
import { LANGUAGES, DEFAULT_LANGUAGE } from "../data/books";
import {
  LanguagesResponseSchema,
  ErrorResponseSchema,
} from "../schemas/openapi";

const languages = new OpenAPIHono();

const getLanguagesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Languages"],
  summary: "List available languages",
  description: "Get a list of all available languages for Bible translations",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: LanguagesResponseSchema,
        },
      },
      description: "List of available languages",
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

languages.openapi(getLanguagesRoute, async (c) => {
  const availableCodes = await getAvailableLanguages();

  const languageList = availableCodes.map((code) => {
    const info = LANGUAGES[code] || { name: code, nativeName: code };
    const isDefault = code === DEFAULT_LANGUAGE;
    return {
      code,
      name: info.name,
      native_name: info.nativeName,
      ...(isDefault && { default: true }),
    };
  });

  return c.json({
    default: DEFAULT_LANGUAGE,
    languages: languageList,
  });
});

export default languages;
