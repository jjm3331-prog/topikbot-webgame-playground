-- Add point_value (배점) column for each question
ALTER TABLE public.mock_question_bank 
ADD COLUMN IF NOT EXISTS point_value INTEGER DEFAULT 3;

-- Add instruction_text (지시문) for question groups like "※ [11~14] 다음은 무엇에 대해..."
ALTER TABLE public.mock_question_bank 
ADD COLUMN IF NOT EXISTS instruction_text TEXT DEFAULT NULL;

-- Add all 7 language explanation columns (ja, zh, ru, uz already exist in schema)
-- Checking existing columns and adding missing ones
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mock_question_bank' AND column_name = 'explanation_ja') THEN
    ALTER TABLE public.mock_question_bank ADD COLUMN explanation_ja TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mock_question_bank' AND column_name = 'explanation_zh') THEN
    ALTER TABLE public.mock_question_bank ADD COLUMN explanation_zh TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mock_question_bank' AND column_name = 'explanation_ru') THEN
    ALTER TABLE public.mock_question_bank ADD COLUMN explanation_ru TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mock_question_bank' AND column_name = 'explanation_uz') THEN
    ALTER TABLE public.mock_question_bank ADD COLUMN explanation_uz TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.mock_question_bank.point_value IS 'Point value for the question (e.g., 3점, 4점)';
COMMENT ON COLUMN public.mock_question_bank.instruction_text IS 'Instruction text for question groups like "※ [11~14] 다음은..."';