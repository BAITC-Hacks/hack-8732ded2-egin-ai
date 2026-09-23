import { describe, expect, it } from "vitest";
import en from "./locales/en/translate.json";
import kk from "./locales/kk/translate.json";
import ru from "./locales/ru/translate.json";

interface TranslationResource {
  upload: {
    title: string;
    drop: string;
    save: string;
    saved: string;
  };
  languages: {
    ru: string;
    en: string;
    kk: string;
  };
}

const resources: Record<string, TranslationResource> = {
  ru: ru as TranslationResource,
  en: en as TranslationResource,
  kk: kk as TranslationResource,
};

describe("frontend translations", (): void => {
  it("contains CSV upload labels in every supported locale", (): void => {
    for (const resource of Object.values(resources)) {
      expect(resource.upload.title).not.toBe("");
      expect(resource.upload.drop).not.toBe("");
      expect(resource.upload.save).not.toBe("");
      expect(resource.upload.saved).not.toBe("");
    }
  });

  it("contains all supported language labels", (): void => {
    for (const resource of Object.values(resources)) {
      expect(resource.languages.ru).not.toBe("");
      expect(resource.languages.en).not.toBe("");
      expect(resource.languages.kk).not.toBe("");
    }
  });
});
