import type { SupportedLanguage } from "@/lib/interfaces/languages";

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "German",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  "pt-br": "Portuguese (Brazil)",
  "pt-pt": "Portuguese (Portugal)",
  ru: "Russian",
  "zh-tw": "Chinese (Traditional)",
  "zh-cn": "Chinese (Simplified)",
  ko: "Korean",
  nl: "Dutch",
  id: "Indonesian",
  th: "Thai",
  lo: "Lao",
  zht: "Chinese (Traditional)",
  zhs: "Chinese (Simplified)",
};

// This build ships English (US) only. To add a language, add its code here and
// a locales/<code>/ folder with every namespace file from locales/en/.
export const SUPPORTED_LANGUAGES = ["en"] as const;
export const LANGUAGE_NATIVE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
};

export const EMPTY_LANGUAGES: string[] = [];
