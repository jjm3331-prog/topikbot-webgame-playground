-- =============================================
-- TOPIK 어휘 학습 시스템 DB 스키마
-- =============================================

-- 1. TOPIK 표준 어휘 테이블 (국제 통용 한국어 표준 교육과정 기반)
CREATE TABLE public.topik_vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seq_no INTEGER NOT NULL,
  level_seq INTEGER,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 6),
  word TEXT NOT NULL,
  word_code TEXT,
  pos TEXT,
  example_phrase TEXT,
  difficulty TEXT CHECK (difficulty IN ('초급', '중급', '고급')),
  meaning_vi TEXT,
  meaning_en TEXT,
  meaning_ja TEXT,
  meaning_zh TEXT,
  meaning_ru TEXT,
  meaning_uz TEXT,
  example_sentence TEXT,
  example_sentence_vi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seq_no)
);

-- 2. Mini Cloze 빈칸 퀴즈 테이블 (사전 생성)
CREATE TABLE public.cloze_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vocabulary_id UUID REFERENCES public.topik_vocabulary(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 6),
  sentence TEXT NOT NULL,
  blank_word TEXT NOT NULL,
  wrong_answer TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('초급', '중급', '고급')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. O/X 문법 퀴즈 테이블 (사전 생성)
CREATE TABLE public.grammar_ox_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 6),
  statement TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  explanation_vi TEXT,
  grammar_point TEXT,
  difficulty TEXT CHECK (difficulty IN ('초급', '중급', '고급')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 관용표현 테이블 (사전 생성)
CREATE TABLE public.topik_idioms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 6),
  idiom TEXT NOT NULL,
  literal_meaning TEXT NOT NULL,
  actual_meaning TEXT NOT NULL,
  actual_meaning_vi TEXT,
  situation_example TEXT,
  similar_expressions TEXT[],
  difficulty TEXT CHECK (difficulty IN ('초급', '중급', '고급')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. 사용자 실수노트 테이블
CREATE TABLE public.user_mistakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('flash', 'cloze', 'ox', 'idiom')),
  item_id UUID NOT NULL,
  item_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mistake_count INTEGER NOT NULL DEFAULT 1,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- =============================================
-- 인덱스 생성
-- =============================================
CREATE INDEX idx_topik_vocabulary_level ON public.topik_vocabulary(level);
CREATE INDEX idx_topik_vocabulary_word ON public.topik_vocabulary(word);
CREATE INDEX idx_cloze_questions_level ON public.cloze_questions(level);
CREATE INDEX idx_grammar_ox_questions_level ON public.grammar_ox_questions(level);
CREATE INDEX idx_topik_idioms_level ON public.topik_idioms(level);
CREATE INDEX idx_user_mistakes_user_id ON public.user_mistakes(user_id);
CREATE INDEX idx_user_mistakes_next_review ON public.user_mistakes(next_review);

-- =============================================
-- RLS 정책
-- =============================================

-- topik_vocabulary: 모든 사용자 읽기 가능
ALTER TABLE public.topik_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vocabulary" ON public.topik_vocabulary FOR SELECT USING (true);
CREATE POLICY "Admin can manage vocabulary" ON public.topik_vocabulary FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- cloze_questions: 모든 사용자 읽기 가능
ALTER TABLE public.cloze_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cloze questions" ON public.cloze_questions FOR SELECT USING (true);
CREATE POLICY "Admin can manage cloze questions" ON public.cloze_questions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- grammar_ox_questions: 모든 사용자 읽기 가능
ALTER TABLE public.grammar_ox_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grammar ox questions" ON public.grammar_ox_questions FOR SELECT USING (true);
CREATE POLICY "Admin can manage grammar ox questions" ON public.grammar_ox_questions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- topik_idioms: 모든 사용자 읽기 가능
ALTER TABLE public.topik_idioms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read idioms" ON public.topik_idioms FOR SELECT USING (true);
CREATE POLICY "Admin can manage idioms" ON public.topik_idioms FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- user_mistakes: 본인만 접근 가능
ALTER TABLE public.user_mistakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mistakes" ON public.user_mistakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mistakes" ON public.user_mistakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mistakes" ON public.user_mistakes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mistakes" ON public.user_mistakes FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- updated_at 자동 업데이트 트리거
-- =============================================
CREATE TRIGGER update_user_mistakes_updated_at
  BEFORE UPDATE ON public.user_mistakes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();