-- Drop the old section check constraint
ALTER TABLE public.mock_question_bank DROP CONSTRAINT mock_question_bank_section_check;

-- Add new section check constraint including 'writing'
ALTER TABLE public.mock_question_bank ADD CONSTRAINT mock_question_bank_section_check 
CHECK (section = ANY (ARRAY['listening'::text, 'reading'::text, 'writing'::text]));