// This build ships English (US) only. To add a language, add its code here,
// its name below and a locales/<code>.json file.
export const APP_LANGUAGES = ["en"] as const;

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGE_NAMES: Record<(typeof APP_LANGUAGES)[number], string> = {
  en: "English",
};
