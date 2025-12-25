-- Writing Correction 캐싱을 위한 content_hash 컬럼 추가
-- 동일한 문제+답안 조합에 대해 일관된 점수를 반환하기 위함

ALTER TABLE public.writing_corrections 
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 해시 기반 빠른 검색을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_writing_corrections_content_hash 
ON public.writing_corrections (user_id, content_hash);

-- 문제 텍스트 저장 (캐시 확인용)
ALTER TABLE public.writing_corrections 
ADD COLUMN IF NOT EXISTS question_text TEXT;

-- 캐시 히트 여부 추적
ALTER TABLE public.writing_corrections 
ADD COLUMN IF NOT EXISTS is_cached BOOLEAN DEFAULT FALSE;