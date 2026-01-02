-- 한자어 마인드맵 데이터 테이블

-- 1. 대단원 (Unit/Chapter) 테이블
CREATE TABLE public.hanja_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_number INT NOT NULL UNIQUE,
  title_ko VARCHAR(100) NOT NULL,
  title_en VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. 소단원 (Day) 테이블
CREATE TABLE public.hanja_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES public.hanja_units(id) ON DELETE CASCADE,
  day_number INT NOT NULL UNIQUE,
  topic_ko VARCHAR(100) NOT NULL,
  topic_en VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. 한자 뿌리 (Hanja Root) 테이블
CREATE TABLE public.hanja_roots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID REFERENCES public.hanja_days(id) ON DELETE CASCADE,
  hanja CHAR(1) NOT NULL,
  reading_ko VARCHAR(10) NOT NULL,
  meaning_ko VARCHAR(50) NOT NULL,
  meaning_en VARCHAR(100),
  meaning_ja VARCHAR(100),
  meaning_zh VARCHAR(100),
  meaning_vi VARCHAR(100),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 파생어 (Derived Words) 테이블
CREATE TABLE public.hanja_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  root_id UUID REFERENCES public.hanja_roots(id) ON DELETE CASCADE,
  word VARCHAR(20) NOT NULL,
  meaning_ko VARCHAR(100),
  meaning_en VARCHAR(200),
  meaning_ja VARCHAR(200),
  meaning_zh VARCHAR(200),
  meaning_vi VARCHAR(200),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. 사용자 학습 진도 테이블
CREATE TABLE public.hanja_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_id UUID REFERENCES public.hanja_days(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  mastered_words INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  last_studied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_id)
);

-- 6. 사용자가 마스터한 단어 테이블
CREATE TABLE public.hanja_mastered_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word_id UUID REFERENCES public.hanja_words(id) ON DELETE CASCADE,
  mastered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, word_id)
);

-- 인덱스 생성
CREATE INDEX idx_hanja_days_unit ON public.hanja_days(unit_id);
CREATE INDEX idx_hanja_days_day_number ON public.hanja_days(day_number);
CREATE INDEX idx_hanja_roots_day ON public.hanja_roots(day_id);
CREATE INDEX idx_hanja_words_root ON public.hanja_words(root_id);
CREATE INDEX idx_hanja_progress_user ON public.hanja_learning_progress(user_id);
CREATE INDEX idx_hanja_mastered_user ON public.hanja_mastered_words(user_id);

-- RLS 활성화
ALTER TABLE public.hanja_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanja_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanja_roots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanja_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanja_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hanja_mastered_words ENABLE ROW LEVEL SECURITY;

-- 콘텐츠 테이블: 모든 사용자 읽기 허용
CREATE POLICY "Anyone can view hanja units" ON public.hanja_units FOR SELECT USING (true);
CREATE POLICY "Anyone can view hanja days" ON public.hanja_days FOR SELECT USING (true);
CREATE POLICY "Anyone can view hanja roots" ON public.hanja_roots FOR SELECT USING (true);
CREATE POLICY "Anyone can view hanja words" ON public.hanja_words FOR SELECT USING (true);

-- 학습 진도 테이블: 본인만 CRUD
CREATE POLICY "Users can view own hanja progress" ON public.hanja_learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hanja progress" ON public.hanja_learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hanja progress" ON public.hanja_learning_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hanja progress" ON public.hanja_learning_progress FOR DELETE USING (auth.uid() = user_id);

-- 마스터 단어 테이블: 본인만 CRUD
CREATE POLICY "Users can view own mastered words" ON public.hanja_mastered_words FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mastered words" ON public.hanja_mastered_words FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mastered words" ON public.hanja_mastered_words FOR DELETE USING (auth.uid() = user_id);

-- 업데이트 트리거
CREATE TRIGGER update_hanja_progress_updated_at
  BEFORE UPDATE ON public.hanja_learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();