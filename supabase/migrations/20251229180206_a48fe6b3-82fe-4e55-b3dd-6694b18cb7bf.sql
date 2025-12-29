-- [5-8] 그림 문제용 option_images 컬럼 추가
-- 4개의 이미지 URL을 저장하는 JSONB 배열
ALTER TABLE public.mock_question_bank
ADD COLUMN IF NOT EXISTS option_images jsonb DEFAULT '[]'::jsonb;