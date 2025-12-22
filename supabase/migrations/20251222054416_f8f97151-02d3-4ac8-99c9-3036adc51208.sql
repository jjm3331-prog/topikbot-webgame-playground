-- AI 질문 사용량 추적 테이블 (일 5회 제한)
CREATE TABLE public.ai_question_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- TOPIK Writing 첨삭 저장 테이블
CREATE TABLE public.writing_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_image_url TEXT,
  answer_image_url TEXT,
  answer_text TEXT,
  correction_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_question_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_question_usage
CREATE POLICY "Users can view own question usage"
  ON public.ai_question_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question usage"
  ON public.ai_question_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question usage"
  ON public.ai_question_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for writing_corrections
CREATE POLICY "Users can view own writing corrections"
  ON public.writing_corrections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own writing corrections"
  ON public.writing_corrections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own writing corrections"
  ON public.writing_corrections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own writing corrections"
  ON public.writing_corrections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_question_usage_updated_at
  BEFORE UPDATE ON public.ai_question_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_writing_corrections_updated_at
  BEFORE UPDATE ON public.writing_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for writing images
INSERT INTO storage.buckets (id, name, public) VALUES ('writing-images', 'writing-images', true);

-- Storage policies
CREATE POLICY "Anyone can view writing images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'writing-images');

CREATE POLICY "Users can upload own writing images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'writing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own writing images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'writing-images' AND auth.uid()::text = (storage.foldername(name))[1]);