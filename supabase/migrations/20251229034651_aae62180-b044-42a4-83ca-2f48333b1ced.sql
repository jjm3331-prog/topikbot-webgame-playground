-- 모의고사 문제 템플릿 (유형별 설정)
CREATE TABLE public.mock_question_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TOPIK_I', 'TOPIK_II', 'TOPIK_EPS')),
  section TEXT NOT NULL CHECK (section IN ('listening', 'reading')),
  part_number INTEGER NOT NULL,
  part_name TEXT NOT NULL,
  part_name_ko TEXT,
  part_name_vi TEXT,
  question_count INTEGER NOT NULL DEFAULT 5,
  time_limit_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  description TEXT,
  description_ko TEXT,
  description_vi TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  generation_hints JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 모의고사 문제 은행
CREATE TABLE public.mock_question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.mock_question_templates(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TOPIK_I', 'TOPIK_II', 'TOPIK_EPS')),
  section TEXT NOT NULL CHECK (section IN ('listening', 'reading')),
  part_number INTEGER NOT NULL,
  question_number INTEGER,
  question_text TEXT NOT NULL,
  question_audio_url TEXT,
  question_image_url TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer INTEGER NOT NULL,
  explanation_ko TEXT,
  explanation_vi TEXT,
  explanation_en TEXT,
  explanation_ja TEXT,
  explanation_zh TEXT,
  explanation_ru TEXT,
  explanation_uz TEXT,
  grammar_points JSONB DEFAULT '[]'::jsonb,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 모의고사 시도 기록
CREATE TABLE public.mock_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('TOPIK_I', 'TOPIK_II', 'TOPIK_EPS')),
  exam_mode TEXT NOT NULL CHECK (exam_mode IN ('full', 'section', 'part', 'weakness')),
  section TEXT CHECK (section IN ('listening', 'reading')),
  part_number INTEGER,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  listening_score INTEGER,
  reading_score INTEGER,
  total_score INTEGER,
  predicted_grade INTEGER,
  time_limit_seconds INTEGER,
  time_taken_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 모의고사 답안 기록
CREATE TABLE public.mock_exam_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.mock_question_bank(id),
  user_answer INTEGER,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 모의고사 전용 오답노트
CREATE TABLE public.mock_exam_mistakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.mock_question_bank(id),
  attempt_id UUID REFERENCES public.mock_exam_attempts(id) ON DELETE SET NULL,
  mistake_category TEXT CHECK (mistake_category IN ('grammar', 'vocabulary', 'comprehension', 'listening', 'speed')),
  ai_analysis TEXT,
  user_notes TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN NOT NULL DEFAULT false,
  mastered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.mock_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_mistakes ENABLE ROW LEVEL SECURITY;

-- 템플릿: 누구나 읽기, 어드민만 관리
CREATE POLICY "Anyone can view active templates" ON public.mock_question_templates
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage templates" ON public.mock_question_templates
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 문제 은행: 누구나 읽기, 어드민만 관리
CREATE POLICY "Anyone can view active questions" ON public.mock_question_bank
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage questions" ON public.mock_question_bank
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 시도 기록: 본인만
CREATE POLICY "Users can view own attempts" ON public.mock_exam_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON public.mock_exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.mock_exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- 답안 기록: 본인만
CREATE POLICY "Users can view own answers" ON public.mock_exam_answers
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.mock_exam_attempts WHERE id = attempt_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own answers" ON public.mock_exam_answers
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.mock_exam_attempts WHERE id = attempt_id AND user_id = auth.uid()));

-- 오답노트: 본인만
CREATE POLICY "Users can view own mistakes" ON public.mock_exam_mistakes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mistakes" ON public.mock_exam_mistakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mistakes" ON public.mock_exam_mistakes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mistakes" ON public.mock_exam_mistakes
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_mock_templates_exam_type ON public.mock_question_templates(exam_type, section);
CREATE INDEX idx_mock_questions_template ON public.mock_question_bank(template_id);
CREATE INDEX idx_mock_questions_exam ON public.mock_question_bank(exam_type, section, part_number);
CREATE INDEX idx_mock_attempts_user ON public.mock_exam_attempts(user_id);
CREATE INDEX idx_mock_mistakes_user ON public.mock_exam_mistakes(user_id, mastered);

-- updated_at 트리거
CREATE TRIGGER update_mock_templates_updated_at BEFORE UPDATE ON public.mock_question_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mock_questions_updated_at BEFORE UPDATE ON public.mock_question_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mock_mistakes_updated_at BEFORE UPDATE ON public.mock_exam_mistakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();