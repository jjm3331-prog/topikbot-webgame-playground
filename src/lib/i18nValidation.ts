/**
 * i18n Validation Utilities
 * Validates that all language files have the same keys
 */

import ko from '@/i18n/locales/ko.json';
import vi from '@/i18n/locales/vi.json';
import en from '@/i18n/locales/en.json';
import ja from '@/i18n/locales/ja.json';
import zh from '@/i18n/locales/zh.json';
import ru from '@/i18n/locales/ru.json';
import uz from '@/i18n/locales/uz.json';

type TranslationObject = Record<string, unknown>;

const locales: Record<string, TranslationObject> = {
  ko,
  vi,
  en,
  ja,
  zh,
  ru,
  uz,
};

/**
 * Get all keys from a nested object as dot-notation paths
 */
function getAllKeys(obj: TranslationObject, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Find missing keys in a locale compared to reference locale
 */
function findMissingKeys(
  referenceLocale: TranslationObject,
  targetLocale: TranslationObject,
  refLangCode: string,
  targetLangCode: string
): { key: string; inLang: string; missingInLang: string }[] {
  const refKeys = getAllKeys(referenceLocale);
  const targetKeys = new Set(getAllKeys(targetLocale));
  
  return refKeys
    .filter(key => !targetKeys.has(key))
    .map(key => ({
      key,
      inLang: refLangCode,
      missingInLang: targetLangCode,
    }));
}

/**
 * Validate all locales have the same keys as the Korean (ko) reference
 * Returns array of missing key info
 */
export function validateI18nKeys(): {
  valid: boolean;
  missingKeys: { key: string; inLang: string; missingInLang: string }[];
  summary: Record<string, number>;
} {
  const missingKeys: { key: string; inLang: string; missingInLang: string }[] = [];
  const summary: Record<string, number> = {};
  
  // Use Korean as reference
  const referenceLocale = locales.ko;
  
  for (const [langCode, locale] of Object.entries(locales)) {
    if (langCode === 'ko') continue;
    
    const missing = findMissingKeys(referenceLocale, locale, 'ko', langCode);
    missingKeys.push(...missing);
    summary[langCode] = missing.length;
  }
  
  return {
    valid: missingKeys.length === 0,
    missingKeys,
    summary,
  };
}

/**
 * Check specific section keys across all locales
 */
export function checkSectionKeys(sectionPath: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  
  for (const [langCode, locale] of Object.entries(locales)) {
    const parts = sectionPath.split('.');
    let current: unknown = locale;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as object)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    
    result[langCode] = current !== undefined;
  }
  
  return result;
}

/**
 * Log validation results to console (for development)
 */
export function logI18nValidation(): void {
  if (import.meta.env.DEV) {
    const { valid, missingKeys, summary } = validateI18nKeys();
    
    if (!valid) {
      console.group('🌐 i18n Validation');
      console.warn('Missing translation keys found:');
      console.table(summary);
      
      // Group by missing language
      const byLang = missingKeys.reduce((acc, { key, missingInLang }) => {
        if (!acc[missingInLang]) acc[missingInLang] = [];
        acc[missingInLang].push(key);
        return acc;
      }, {} as Record<string, string[]>);
      
      for (const [lang, keys] of Object.entries(byLang)) {
        console.groupCollapsed(`${lang}: ${keys.length} missing keys`);
        keys.slice(0, 10).forEach(k => console.log(`  - ${k}`));
        if (keys.length > 10) console.log(`  ... and ${keys.length - 10} more`);
        console.groupEnd();
      }
      console.groupEnd();
    } else {
      console.log('✅ i18n: All translation keys are present in all locales');
    }
    
    // Check writingPage.cache specifically
    const cacheCheck = checkSectionKeys('writingPage.cache');
    const allHaveCache = Object.values(cacheCheck).every(Boolean);
    
    if (!allHaveCache) {
      console.warn('❌ writingPage.cache missing in:', 
        Object.entries(cacheCheck)
          .filter(([, has]) => !has)
          .map(([lang]) => lang)
          .join(', ')
      );
    } else {
      console.log('✅ writingPage.cache: Present in all locales');
    }
  }
}
