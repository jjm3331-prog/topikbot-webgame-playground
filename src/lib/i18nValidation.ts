/**
 * i18n Validation Utilities (DEV)
 *
 * Goals:
 * - Detect missing keys across locales (vs reference)
 * - Detect extra keys (keys present in non-reference but missing in reference)
 * - Detect non-string leaf values (accidental objects/arrays)
 *
 * NOTE: This module is meant for development only.
 */

import ko from "@/i18n/locales/ko.json";
import vi from "@/i18n/locales/vi.json";
import en from "@/i18n/locales/en.json";
import ja from "@/i18n/locales/ja.json";
import zh from "@/i18n/locales/zh.json";
import ru from "@/i18n/locales/ru.json";
import uz from "@/i18n/locales/uz.json";

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

export type I18nLeafTypeIssue = {
  key: string;
  lang: string;
  foundType: string;
};

export type I18nMissingKey = {
  key: string;
  inLang: string;
  missingInLang: string;
};

export type I18nValidationReport = {
  valid: boolean;
  referenceLang: string;
  missingKeys: I18nMissingKey[];
  extraKeys: { key: string; extraInLang: string; referenceLang: string }[];
  leafTypeIssues: I18nLeafTypeIssue[];
  summary: {
    missingByLang: Record<string, number>;
    extraByLang: Record<string, number>;
    leafTypeIssuesByLang: Record<string, number>;
  };
};

/**
 * Get all leaf keys from a nested object as dot-notation paths.
 * A "leaf" is a non-object value (string/number/etc) OR an array.
 */
function getAllLeafKeys(obj: TranslationObject, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...getAllLeafKeys(value as TranslationObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function getLeafValue(obj: TranslationObject, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as object)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function describeType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Validate all locales have the same keys as the reference, and that leafs are strings.
 */
export function validateI18nKeys(referenceLang: keyof typeof locales = "ko"): I18nValidationReport {
  const refLocale = locales[referenceLang];
  const refKeys = getAllLeafKeys(refLocale);
  const refKeySet = new Set(refKeys);

  const missingKeys: I18nMissingKey[] = [];
  const extraKeys: { key: string; extraInLang: string; referenceLang: string }[] = [];
  const leafTypeIssues: I18nLeafTypeIssue[] = [];

  const missingByLang: Record<string, number> = {};
  const extraByLang: Record<string, number> = {};
  const leafTypeIssuesByLang: Record<string, number> = {};

  for (const [langCode, locale] of Object.entries(locales)) {
    if (langCode === referenceLang) continue;

    const targetKeys = getAllLeafKeys(locale);
    const targetKeySet = new Set(targetKeys);

    // Missing (ref -> target)
    const missing = refKeys.filter((k) => !targetKeySet.has(k));
    missingByLang[langCode] = missing.length;
    missingKeys.push(
      ...missing.map((key) => ({
        key,
        inLang: String(referenceLang),
        missingInLang: langCode,
      }))
    );

    // Extra (target -> ref)
    const extra = targetKeys.filter((k) => !refKeySet.has(k));
    extraByLang[langCode] = extra.length;
    extraKeys.push(
      ...extra.map((key) => ({
        key,
        extraInLang: langCode,
        referenceLang: String(referenceLang),
      }))
    );

    // Leaf type checks: every ref key must exist and be string
    let typeIssues = 0;
    for (const key of refKeys) {
      const v = getLeafValue(locale, key);
      if (typeof v !== "string") {
        // undefined is already covered by missing keys, but we still count as type issue
        typeIssues++;
        leafTypeIssues.push({ key, lang: langCode, foundType: describeType(v) });
      }
    }
    leafTypeIssuesByLang[langCode] = typeIssues;
  }

  const valid = missingKeys.length === 0 && extraKeys.length === 0 && leafTypeIssues.length === 0;

  return {
    valid,
    referenceLang: String(referenceLang),
    missingKeys,
    extraKeys,
    leafTypeIssues,
    summary: {
      missingByLang,
      extraByLang,
      leafTypeIssuesByLang,
    },
  };
}

/**
 * DEV logger. Prints compact summaries first, then allows deep inspection.
 */
export function logI18nValidation(referenceLang: keyof typeof locales = "ko"): void {
  if (!import.meta.env.DEV) return;

  const report = validateI18nKeys(referenceLang);

  if (report.valid) {
    console.log("✅ i18n: All locales match reference and contain string leafs");
    return;
  }

  console.group("🌐 i18n Validation (DEV)");
  console.info("Reference:", report.referenceLang);
  console.warn("Missing keys summary:");
  console.table(report.summary.missingByLang);
  console.warn("Extra keys summary:");
  console.table(report.summary.extraByLang);
  console.warn("Leaf type issues summary:");
  console.table(report.summary.leafTypeIssuesByLang);

  const maxList = 50;

  if (report.missingKeys.length) {
    console.groupCollapsed(`Missing keys (${report.missingKeys.length})`);
    report.missingKeys.slice(0, maxList).forEach((x) => console.log(`${x.missingInLang} missing ${x.key}`));
    if (report.missingKeys.length > maxList) console.log(`... +${report.missingKeys.length - maxList} more`);
    console.groupEnd();
  }

  if (report.extraKeys.length) {
    console.groupCollapsed(`Extra keys (${report.extraKeys.length})`);
    report.extraKeys.slice(0, maxList).forEach((x) => console.log(`${x.extraInLang} extra ${x.key}`));
    if (report.extraKeys.length > maxList) console.log(`... +${report.extraKeys.length - maxList} more`);
    console.groupEnd();
  }

  if (report.leafTypeIssues.length) {
    console.groupCollapsed(`Leaf type issues (${report.leafTypeIssues.length})`);
    report.leafTypeIssues
      .slice(0, maxList)
      .forEach((x) => console.log(`${x.lang} ${x.key} -> ${x.foundType}`));
    if (report.leafTypeIssues.length > maxList) console.log(`... +${report.leafTypeIssues.length - maxList} more`);
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Minimal smoke test helper for future use.
 */
export function getTranslationSnapshot(langCode: string, keyPaths: string[]): Record<string, string | undefined> {
  const locale = locales[langCode];
  if (!locale) return {};

  const result: Record<string, string | undefined> = {};

  for (const keyPath of keyPaths) {
    const v = getLeafValue(locale, keyPath);
    result[keyPath] = typeof v === "string" ? v : undefined;
  }

  return result;
}
