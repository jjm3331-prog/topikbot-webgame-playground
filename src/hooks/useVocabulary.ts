import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// 어휘 데이터 타입
export interface VocabWord {
  id: string;
  word: string;
  pos: string | null;
  level: number;
  seq_no: number;
  level_seq: number | null;
  example_phrase: string | null;
  example_sentence: string | null;
  example_sentence_vi: string | null;
  meaning_vi: string | null;
  meaning_en: string | null;
  meaning_ja: string | null;
  meaning_zh: string | null;
  meaning_ru: string | null;
  meaning_uz: string | null;
  difficulty: string | null;
}

// 7개국 언어 코드 타입
export type SupportedLanguage = 'ko' | 'vi' | 'en' | 'ja' | 'zh' | 'ru' | 'uz';

// 언어별 meaning 필드 매핑
const meaningFieldMap: Record<Exclude<SupportedLanguage, 'ko'>, keyof VocabWord> = {
  vi: 'meaning_vi',
  en: 'meaning_en',
  ja: 'meaning_ja',
  zh: 'meaning_zh',
  ru: 'meaning_ru',
  uz: 'meaning_uz',
};

// 언어별 레이블
export const languageLabels: Record<SupportedLanguage, string> = {
  ko: '한국어',
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
  zh: '中文',
  ru: 'Русский',
  uz: "O'zbek",
};

// 언어별 "뜻 없음" 메시지
const noMeaningMessages: Record<SupportedLanguage, string> = {
  ko: '단어',
  vi: 'Chưa có nghĩa',
  en: 'No meaning available',
  ja: '意味なし',
  zh: '暂无释义',
  ru: 'Нет значения',
  uz: "Ma'nosi yo'q",
};

/**
 * 어휘 학습을 위한 7개국 언어 지원 훅
 */
export function useVocabulary() {
  const { i18n } = useTranslation();

  /**
   * 현재 언어 코드 반환 (7개국 중 하나)
   */
  const getCurrentLanguage = useCallback((): SupportedLanguage => {
    const lang = i18n.language as SupportedLanguage;
    const supportedLangs: SupportedLanguage[] = ['ko', 'vi', 'en', 'ja', 'zh', 'ru', 'uz'];
    return supportedLangs.includes(lang) ? lang : 'en'; // fallback to English
  }, [i18n.language]);

  /**
   * 어휘의 뜻을 현재 언어로 반환
   * 우선순위: 현재 언어 → 영어 → 베트남어 → "뜻 없음"
   */
  const getMeaning = useCallback((word: VocabWord, targetLang?: SupportedLanguage): string => {
    const lang = targetLang || getCurrentLanguage();

    // 한국어 선택 시 단어 자체 반환
    if (lang === 'ko') {
      return word.word;
    }

    const fieldName = meaningFieldMap[lang];
    const meaning = word[fieldName] as string | null;

    if (meaning) return meaning;

    // 폴백: 영어 → 베트남어 → 중국어 → 일본어
    const fallbackOrder: (keyof VocabWord)[] = ['meaning_en', 'meaning_vi', 'meaning_zh', 'meaning_ja'];
    for (const field of fallbackOrder) {
      if (field !== fieldName && word[field]) {
        return word[field] as string;
      }
    }

    return noMeaningMessages[lang];
  }, [getCurrentLanguage]);

  /**
   * 특정 언어의 뜻이 있는지 확인
   */
  const hasMeaning = useCallback((word: VocabWord, lang?: SupportedLanguage): boolean => {
    const targetLang = lang || getCurrentLanguage();
    if (targetLang === 'ko') return true;
    
    const fieldName = meaningFieldMap[targetLang];
    return !!word[fieldName];
  }, [getCurrentLanguage]);

  /**
   * 모든 언어의 뜻을 객체로 반환
   */
  const getAllMeanings = useCallback((word: VocabWord): Record<SupportedLanguage, string | null> => {
    return {
      ko: word.word,
      vi: word.meaning_vi,
      en: word.meaning_en,
      ja: word.meaning_ja,
      zh: word.meaning_zh,
      ru: word.meaning_ru,
      uz: word.meaning_uz,
    };
  }, []);

  /**
   * 급수별 레벨 설정
   */
  const getLevelConfig = useCallback((level: number) => {
    const configs: Record<number, { label: string; color: string; desc: string; group: string }> = {
      1: { label: "1급", color: "from-green-400 to-emerald-500", desc: "입문", group: "초급" },
      2: { label: "2급", color: "from-green-500 to-teal-500", desc: "초급", group: "초급" },
      3: { label: "3급", color: "from-blue-400 to-cyan-500", desc: "중급I", group: "중급" },
      4: { label: "4급", color: "from-blue-500 to-indigo-500", desc: "중급II", group: "중급" },
      5: { label: "5급", color: "from-purple-500 to-violet-500", desc: "고급I", group: "고급" },
      6: { label: "6급", color: "from-purple-600 to-pink-500", desc: "고급II", group: "고급" },
    };
    return configs[level] || configs[1];
  }, []);

  /**
   * 급수 그룹 (1-2, 3-4, 5-6)
   */
  const getLevelGroups = useCallback(() => {
    return [
      { levels: [1, 2], label: "1-2급", sublabel: "초급", color: "from-green-400 to-emerald-500" },
      { levels: [3, 4], label: "3-4급", sublabel: "중급", color: "from-blue-400 to-cyan-500" },
      { levels: [5, 6], label: "5-6급", sublabel: "고급", color: "from-purple-500 to-pink-500" },
    ];
  }, []);

  return {
    getCurrentLanguage,
    getMeaning,
    hasMeaning,
    getAllMeanings,
    getLevelConfig,
    getLevelGroups,
    languageLabels,
  };
}

export default useVocabulary;
