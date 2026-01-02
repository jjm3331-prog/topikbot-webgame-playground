-- hanja_words 테이블에 정의(definition)와 예문(example) 컬럼 추가
ALTER TABLE public.hanja_words 
ADD COLUMN IF NOT EXISTS definition_ko TEXT,
ADD COLUMN IF NOT EXISTS definition_en TEXT,
ADD COLUMN IF NOT EXISTS definition_ja TEXT,
ADD COLUMN IF NOT EXISTS definition_zh TEXT,
ADD COLUMN IF NOT EXISTS definition_vi TEXT,
ADD COLUMN IF NOT EXISTS definition_ru TEXT,
ADD COLUMN IF NOT EXISTS definition_uz TEXT,
ADD COLUMN IF NOT EXISTS example_sentence TEXT,
ADD COLUMN IF NOT EXISTS example_translation_en TEXT,
ADD COLUMN IF NOT EXISTS example_translation_ja TEXT,
ADD COLUMN IF NOT EXISTS example_translation_zh TEXT,
ADD COLUMN IF NOT EXISTS example_translation_vi TEXT,
ADD COLUMN IF NOT EXISTS example_translation_ru TEXT,
ADD COLUMN IF NOT EXISTS example_translation_uz TEXT;

-- 기존 데이터에 대해 기본 정의 업데이트 (meaning을 정의로 사용)
UPDATE public.hanja_words 
SET definition_ko = COALESCE(meaning_ko, ''),
    definition_en = COALESCE(meaning_en, ''),
    definition_ja = COALESCE(meaning_ja, ''),
    definition_zh = COALESCE(meaning_zh, ''),
    definition_vi = COALESCE(meaning_vi, '')
WHERE definition_ko IS NULL;