/**
 * 7개국어 해설 검증 & 자동 보정
 * - 누락 필드 검출
 * - 형식 오류 검증
 * - 기본값 자동 채우기
 */

export const SUPPORTED_LANGUAGES = ['ko', 'vi', 'en', 'ja', 'zh', 'ru', 'uz'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface ExplanationFields {
  explanation_ko?: string;
  explanation_vi?: string;
  explanation_en?: string;
  explanation_ja?: string;
  explanation_zh?: string;
  explanation_ru?: string;
  explanation_uz?: string;
}

export interface ValidationResult {
  isValid: boolean;
  missingLanguages: SupportedLanguage[];
  emptyLanguages: SupportedLanguage[];
  formatErrors: FormatError[];
  warnings: string[];
  canAutoFix: boolean;
}

export interface FormatError {
  language: SupportedLanguage;
  error: string;
  suggestion?: string;
}

/**
 * 해설 필드 검증
 */
export function validateExplanations(question: ExplanationFields): ValidationResult {
  const missingLanguages: SupportedLanguage[] = [];
  const emptyLanguages: SupportedLanguage[] = [];
  const formatErrors: FormatError[] = [];
  const warnings: string[] = [];

  // 1. 각 언어별 존재 여부 및 형식 검증
  SUPPORTED_LANGUAGES.forEach(lang => {
    const fieldName = `explanation_${lang}` as keyof ExplanationFields;
    const value = question[fieldName];

    if (value === undefined || value === null) {
      missingLanguages.push(lang);
    } else if (typeof value === 'string') {
      if (value.trim() === '') {
        emptyLanguages.push(lang);
      } else {
        // 형식 검증
        const errors = validateFormat(value, lang);
        formatErrors.push(...errors);
      }
    }
  });

  // 2. 한국어 해설은 필수
  if (missingLanguages.includes('ko') || emptyLanguages.includes('ko')) {
    warnings.push('한국어 해설(explanation_ko)은 필수입니다');
  }

  // 3. 다른 언어 누락 경고
  const missingOtherLangs = [...missingLanguages, ...emptyLanguages].filter(l => l !== 'ko');
  if (missingOtherLangs.length > 0) {
    warnings.push(`다음 언어 해설이 누락됨: ${missingOtherLangs.join(', ')}`);
  }

  // 자동 수정 가능 여부 (한국어 해설이 있으면 가능)
  const hasKoreanExplanation = !missingLanguages.includes('ko') && !emptyLanguages.includes('ko');
  const canAutoFix = hasKoreanExplanation && (missingOtherLangs.length > 0 || formatErrors.length > 0);

  return {
    isValid: missingLanguages.length === 0 && emptyLanguages.length === 0 && formatErrors.length === 0,
    missingLanguages,
    emptyLanguages,
    formatErrors,
    warnings,
    canAutoFix
  };
}

/**
 * 형식 검증
 */
function validateFormat(text: string, lang: SupportedLanguage): FormatError[] {
  const errors: FormatError[] = [];

  // 최소 길이 검증
  if (text.length < 10) {
    errors.push({
      language: lang,
      error: '해설이 너무 짧습니다 (최소 10자)',
      suggestion: '더 상세한 해설을 작성해주세요'
    });
  }

  // HTML 태그 검증 (허용되지 않는 태그)
  const dangerousTags = /<script|<iframe|<object|<embed/i;
  if (dangerousTags.test(text)) {
    errors.push({
      language: lang,
      error: '허용되지 않는 HTML 태그가 포함되어 있습니다',
      suggestion: '텍스트만 사용하거나 안전한 마크업을 사용하세요'
    });
  }

  // 언어별 문자 검증
  if (lang === 'ko' && !/[가-힣]/.test(text)) {
    errors.push({
      language: lang,
      error: '한국어 해설에 한글이 포함되어 있지 않습니다',
      suggestion: '한국어로 해설을 작성해주세요'
    });
  }

  if (lang === 'ja' && !/[ぁ-んァ-ン一-龯]/.test(text)) {
    errors.push({
      language: lang,
      error: '일본어 해설에 일본어 문자가 포함되어 있지 않습니다',
      suggestion: '일본어로 해설을 작성해주세요'
    });
  }

  if (lang === 'zh' && !/[\u4e00-\u9fff]/.test(text)) {
    errors.push({
      language: lang,
      error: '중국어 해설에 한자가 포함되어 있지 않습니다',
      suggestion: '중국어로 해설을 작성해주세요'
    });
  }

  if (lang === 'ru' && !/[а-яА-Я]/.test(text)) {
    errors.push({
      language: lang,
      error: '러시아어 해설에 키릴 문자가 포함되어 있지 않습니다',
      suggestion: '러시아어로 해설을 작성해주세요'
    });
  }

  return errors;
}

/**
 * 누락된 해설 자동 채우기 (placeholder)
 */
export function autoFillMissingExplanations(
  question: ExplanationFields,
  validationResult: ValidationResult
): ExplanationFields {
  const filled = { ...question };
  const koreanExplanation = question.explanation_ko || '';

  // 누락된 언어에 대해 placeholder 추가
  [...validationResult.missingLanguages, ...validationResult.emptyLanguages].forEach(lang => {
    if (lang !== 'ko') {
      const fieldName = `explanation_${lang}` as keyof ExplanationFields;
      const placeholder = getPlaceholderText(lang, koreanExplanation);
      (filled as any)[fieldName] = placeholder;
    }
  });

  return filled;
}

/**
 * 언어별 placeholder 텍스트 생성
 */
function getPlaceholderText(lang: SupportedLanguage, koreanText: string): string {
  const placeholders: Record<SupportedLanguage, string> = {
    ko: koreanText,
    vi: `[Cần dịch] ${koreanText}`,
    en: `[Translation needed] ${koreanText}`,
    ja: `[翻訳が必要] ${koreanText}`,
    zh: `[需要翻译] ${koreanText}`,
    ru: `[Требуется перевод] ${koreanText}`,
    uz: `[Tarjima kerak] ${koreanText}`
  };
  return placeholders[lang];
}

/**
 * 배치 검증 결과 요약
 */
export interface BatchValidationSummary {
  totalQuestions: number;
  validCount: number;
  invalidCount: number;
  autoFixableCount: number;
  languageCoverage: Record<SupportedLanguage, number>;
  commonIssues: string[];
}

export function summarizeBatchValidation(
  results: { question: any; validation: ValidationResult }[]
): BatchValidationSummary {
  const summary: BatchValidationSummary = {
    totalQuestions: results.length,
    validCount: 0,
    invalidCount: 0,
    autoFixableCount: 0,
    languageCoverage: {
      ko: 0, vi: 0, en: 0, ja: 0, zh: 0, ru: 0, uz: 0
    },
    commonIssues: []
  };

  const issueCount = new Map<string, number>();

  results.forEach(({ validation }) => {
    if (validation.isValid) {
      summary.validCount++;
    } else {
      summary.invalidCount++;
    }

    if (validation.canAutoFix) {
      summary.autoFixableCount++;
    }

    // 언어별 커버리지 계산
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (!validation.missingLanguages.includes(lang) && !validation.emptyLanguages.includes(lang)) {
        summary.languageCoverage[lang]++;
      }
    });

    // 이슈 집계
    validation.warnings.forEach(warning => {
      issueCount.set(warning, (issueCount.get(warning) || 0) + 1);
    });
  });

  // 가장 흔한 이슈 3개
  summary.commonIssues = Array.from(issueCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue, count]) => `${issue} (${count}건)`);

  return summary;
}
