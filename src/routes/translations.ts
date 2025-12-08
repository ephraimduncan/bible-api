import { Hono } from "hono";
import {
  discoverTranslations,
  getTranslationsByLanguage,
} from "../services/bible-loader";
import { DEFAULT_TRANSLATION } from "../data/books";
import { LanguageQuerySchema, type TranslationsResponse } from "../schemas";

const translations = new Hono();

translations.get("/", async (c) => {
  const queryResult = LanguageQuerySchema.safeParse(c.req.query());

  if (!queryResult.success) {
    return c.json(
      {
        error: {
          code: "INVALID_QUERY",
          message: queryResult.error.message,
        },
      },
      400
    );
  }

  const { language } = queryResult.data;

  let translationList = await discoverTranslations();

  if (language) {
    translationList = await getTranslationsByLanguage(language);
  }

  const response: TranslationsResponse = {
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
  };

  return c.json(response);
});

export default translations;
