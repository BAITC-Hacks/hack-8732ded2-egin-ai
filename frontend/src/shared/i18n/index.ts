import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en/translate.json";
import kk from "./locales/kk/translate.json";
import ru from "./locales/ru/translate.json";

export const supportedLanguages = ["ru", "en", "kk"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const storedLanguage = window.localStorage.getItem("windcast-language");
const initialLanguage: SupportedLanguage = storedLanguage === "en" || storedLanguage === "kk" || storedLanguage === "ru"
  ? storedLanguage
  : "ru";

void i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, kk: { translation: kk }, ru: { translation: ru } },
    lng: initialLanguage,
    fallbackLng: "ru",
    interpolation: { escapeValue: false },
  });

export { i18n };
