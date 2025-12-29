
-- Video lessons table (영상 메타데이터)
CREATE TABLE public.video_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'education',
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  duration_seconds INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video subtitles table (자막 데이터 - 7개국어)
CREATE TABLE public.video_subtitles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ko',
  subtitles JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, language)
);

-- Video learning progress (학습 진행)
CREATE TABLE public.video_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  total_watches INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER,
  shadowing_attempts INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Video mistakes (비디오 학습 전용 오답노트)
CREATE TABLE public.video_mistakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  subtitle_index INTEGER NOT NULL,
  word TEXT NOT NULL,
  word_meaning TEXT,
  context_sentence TEXT,
  timestamp_start NUMERIC NOT NULL,
  timestamp_end NUMERIC NOT NULL,
  mistake_count INTEGER NOT NULL DEFAULT 1,
  mastered BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_mistakes ENABLE ROW LEVEL SECURITY;

-- video_lessons policies (공개 영상은 누구나 조회, Admin만 관리)
CREATE POLICY "Anyone can view published videos" ON public.video_lessons
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can view all videos" ON public.video_lessons
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage videos" ON public.video_lessons
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- video_subtitles policies
CREATE POLICY "Anyone can view subtitles of published videos" ON public.video_subtitles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.video_lessons 
      WHERE id = video_id AND is_published = true
    )
  );

CREATE POLICY "Admins can view all subtitles" ON public.video_subtitles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage subtitles" ON public.video_subtitles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- video_learning_progress policies
CREATE POLICY "Users can view own progress" ON public.video_learning_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.video_learning_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.video_learning_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- video_mistakes policies
CREATE POLICY "Users can view own mistakes" ON public.video_mistakes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mistakes" ON public.video_mistakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mistakes" ON public.video_mistakes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mistakes" ON public.video_mistakes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_video_subtitles_video_id ON public.video_subtitles(video_id);
CREATE INDEX idx_video_subtitles_language ON public.video_subtitles(language);
CREATE INDEX idx_video_learning_progress_user ON public.video_learning_progress(user_id);
CREATE INDEX idx_video_mistakes_user ON public.video_mistakes(user_id);
CREATE INDEX idx_video_mistakes_video ON public.video_mistakes(video_id);

-- Update trigger for timestamps
CREATE TRIGGER update_video_lessons_updated_at
  BEFORE UPDATE ON public.video_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_subtitles_updated_at
  BEFORE UPDATE ON public.video_subtitles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_learning_progress_updated_at
  BEFORE UPDATE ON public.video_learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_mistakes_updated_at
  BEFORE UPDATE ON public.video_mistakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
