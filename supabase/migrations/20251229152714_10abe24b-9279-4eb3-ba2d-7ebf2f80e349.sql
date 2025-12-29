-- Add columns for AI generation workflow
ALTER TABLE public.mock_question_bank
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'manual' CHECK (generation_source IN ('manual', 'ai_generated', 'ai_from_reference')),
ADD COLUMN IF NOT EXISTS reference_doc_url TEXT,
ADD COLUMN IF NOT EXISTS ai_validation_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for reference documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-exam-references', 'mock-exam-references', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload reference documents
CREATE POLICY "Admin upload reference docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mock-exam-references');

-- Allow authenticated users to read reference documents
CREATE POLICY "Admin read reference docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'mock-exam-references');

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_mock_question_bank_status ON public.mock_question_bank(status);
CREATE INDEX IF NOT EXISTS idx_mock_question_bank_topic ON public.mock_question_bank(topic);