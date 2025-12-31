import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ko from "./locales/ko.json";
import vi from "./locales/vi.json";
import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";

export const languages = [
  { code: "ko", name: "한국어", flag: "🇰🇷", nativeName: "한국어" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳", nativeName: "Tiếng Việt" },
  { code: "uz", name: "O'zbek", flag: "🇺🇿", nativeName: "O'zbek tili" },
  { code: "ru", name: "Русский", flag: "🇷🇺", nativeName: "Русский" },
  { code: "en", name: "English", flag: "🇺🇸", nativeName: "English" },
  { code: "zh", name: "中文", flag: "🇨🇳", nativeName: "中文" },
  { code: "ja", name: "日本語", flag: "🇯🇵", nativeName: "日本語" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

const resources = {
  ko: { translation: ko },
  vi: { translation: vi },
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
};

const getUiLangStorageKey = (): string => {
  if (typeof window === "undefined") return "lukato_ui_lang";
  const host = window.location.hostname.toLowerCase();
  const scope = host.endsWith(".kr") || host.includes("topikbot.kr") ? "kr" : "global";
  return `lukato_ui_lang:${scope}`;
};

const normalize = (lng: string | null | undefined): LanguageCode | null => {
  if (!lng) return null;
  const base = String(lng).split("-")[0].toLowerCase();
  const supported = new Set(languages.map((l) => l.code));
  return supported.has(base as LanguageCode) ? (base as LanguageCode) : null;
};

const getHostDefault = (): LanguageCode => {
  if (typeof window === "undefined") return "ko";
  const host = window.location.hostname.toLowerCase();

  // 한국 도메인/서브도메인 → 한국어 기본
  if (host.endsWith(".kr") || host.includes("topikbot.kr")) return "ko";

  // 기타는 브라우저 언어로 가되, 최종 fallback은 ko
  return "ko";
};

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") return "ko";

  const qs = new URLSearchParams(window.location.search);
  const fromQuery = normalize(qs.get("lng"));
  if (fromQuery) return fromQuery;

  const storageKey = getUiLangStorageKey();
  const fromStored = normalize(window.localStorage.getItem(storageKey));
  if (fromStored) return fromStored;

  const hostDefault = getHostDefault();
  const fromNavigator = normalize(window.navigator.language);

  // 도메인 기본을 우선 (한국 페이지는 무조건 ko로 시작)
  return hostDefault ?? fromNavigator ?? "ko";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "ko",
  supportedLngs: languages.map((l) => l.code),
  defaultNS: "translation",
  interpolation: {
    escapeValue: false,
  },
});

// Keep <html lang="..."> in sync for SEO/accessibility
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

export { getUiLangStorageKey };
export default i18n;
