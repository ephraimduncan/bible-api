import { Hono } from "hono";
import { getAvailableLanguages } from "../services/bible-loader";
import { LANGUAGES, DEFAULT_LANGUAGE } from "../data/books";
import type { LanguagesResponse } from "../types/bible";

const languages = new Hono();

languages.get("/", async (c) => {
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

  const response: LanguagesResponse = {
    default: DEFAULT_LANGUAGE,
    languages: languageList,
  };

  return c.json(response);
});

export default languages;
