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
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
