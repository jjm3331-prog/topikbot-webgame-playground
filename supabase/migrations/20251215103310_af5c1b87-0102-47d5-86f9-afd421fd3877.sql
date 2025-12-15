-- 관용어 퀴즈 히스토리 테이블 (사용자별+난이도별 중복 방지용)
CREATE TABLE public.quiz_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- 비로그인 사용자용 세션 ID
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  expression TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스: 사용자+난이도별 빠른 조회
CREATE INDEX idx_quiz_history_user_difficulty ON public.quiz_history(user_id, difficulty);
CREATE INDEX idx_quiz_history_session_difficulty ON public.quiz_history(session_id, difficulty);
CREATE INDEX idx_quiz_history_created_at ON public.quiz_history(created_at);

-- RLS 활성화
ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 INSERT 가능 (비로그인 포함)
CREATE POLICY "Anyone can insert quiz history"
ON public.quiz_history
FOR INSERT
WITH CHECK (true);

-- 정책: 자신의 히스토리만 조회 가능
CREATE POLICY "Users can view own quiz history"
ON public.quiz_history
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND session_id IS NOT NULL)
);

-- 30일 이상된 히스토리 자동 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_quiz_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.quiz_history WHERE created_at < now() - INTERVAL '30 days';
END;
$$;