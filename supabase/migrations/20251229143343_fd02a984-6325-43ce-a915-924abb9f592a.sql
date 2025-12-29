-- Add exam_round column to mock_question_bank for organizing questions by test session (제1회, 제2회, etc.)
ALTER TABLE public.mock_question_bank 
ADD COLUMN IF NOT EXISTS exam_round INTEGER DEFAULT NULL;

-- Add exam_year column for the year of the exam
ALTER TABLE public.mock_question_bank 
ADD COLUMN IF NOT EXISTS exam_year INTEGER DEFAULT NULL;

-- Create index for efficient querying by round
CREATE INDEX IF NOT EXISTS idx_mock_question_bank_exam_round ON public.mock_question_bank(exam_type, exam_round, section);

-- Add comment for clarity
COMMENT ON COLUMN public.mock_question_bank.exam_round IS 'Exam round number (e.g., 83 for 제83회)';
COMMENT ON COLUMN public.mock_question_bank.exam_year IS 'Year of the exam (e.g., 2024)';