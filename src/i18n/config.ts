import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko.json';
import vi from './locales/vi.json';
import uz from './locales/uz.json';
import ru from './locales/ru.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

export const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'uz', name: "O'zbek", flag: '🇺🇿', nativeName: "O'zbek tili" },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'zh', name: '中文', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', nativeName: '日本語' },
] as const;

export type LanguageCode = typeof languages[number]['code'];

const resources = {
  ko: { translation: ko },
  vi: { translation: vi },
  uz: { translation: uz },
  ru: { translation: ru },
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    supportedLngs: languages.map((l) => l.code),
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Language detection priority (user choice takes precedence over marketing links):
      // 1) persisted user choice (localStorage) - highest priority
      // 2) URL ?lng=xx (for marketing/testing, but doesn't override user preference)
      // 3) browser language
      order: ['localStorage', 'querystring', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupQuerystring: 'lng',
    },
  });

// Keep <html lang="..."> in sync for SEO/accessibility
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;
