-- LUKATO 매니저 게임 스키마

-- 1. 그룹 컨셉 ENUM
CREATE TYPE public.group_concept AS ENUM ('fresh', 'crush', 'hiphop', 'retro', 'dark', 'band');

-- 2. 그룹 성별 ENUM  
CREATE TYPE public.group_gender AS ENUM ('male', 'female', 'mixed');

-- 3. 게임 저장 상태 테이블
CREATE TABLE public.manager_game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 설정
  group_name TEXT NOT NULL DEFAULT 'LUKATO',
  group_concept group_concept NOT NULL DEFAULT 'fresh',
  group_gender group_gender NOT NULL DEFAULT 'mixed',
  
  -- 진행 상태
  current_chapter INT NOT NULL DEFAULT 1,
  current_day INT NOT NULL DEFAULT 1,
  season INT NOT NULL DEFAULT 1,
  
  -- 8개 핵심 지표 (0-100)
  stat_vocal INT NOT NULL DEFAULT 50,
  stat_dance INT NOT NULL DEFAULT 50,
  stat_variety INT NOT NULL DEFAULT 50,
  stat_condition INT NOT NULL DEFAULT 80,
  stat_mental INT NOT NULL DEFAULT 70,
  stat_chemistry INT NOT NULL DEFAULT 60,
  stat_media_tone INT NOT NULL DEFAULT 50,
  stat_fandom_power INT NOT NULL DEFAULT 30,
  
  -- 2개 리스크 게이지 (0-100)
  gauge_rumor INT NOT NULL DEFAULT 0,
  gauge_obsession INT NOT NULL DEFAULT 0,
  
  -- 자원
  money BIGINT NOT NULL DEFAULT 50000000,
  
  -- 관계도 (JSON으로 저장)
  relationships JSONB NOT NULL DEFAULT '{}',
  
  -- 스토리 플래그 (선택 기록)
  story_flags JSONB NOT NULL DEFAULT '{}',
  
  -- 엔딩
  ending_type TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, season)
);

-- 4. 챕터 진행 기록
CREATE TABLE public.manager_chapter_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_save_id UUID NOT NULL REFERENCES public.manager_game_saves(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  
  -- 대화 기록
  dialogue_history JSONB NOT NULL DEFAULT '[]',
  
  -- STT 응답 기록
  stt_responses JSONB NOT NULL DEFAULT '[]',
  
  -- 채점 결과
  score_grammar INT DEFAULT 0,
  score_tone INT DEFAULT 0,
  score_intent INT DEFAULT 0,
  total_score INT DEFAULT 0,
  
  -- 선택 결과
  choices_made JSONB NOT NULL DEFAULT '[]',
  stat_changes JSONB NOT NULL DEFAULT '{}',
  
  -- 완료 여부
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RLS 활성화
ALTER TABLE public.manager_game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_chapter_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 - 게임 저장
CREATE POLICY "Users can view own game saves"
  ON public.manager_game_saves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own game saves"
  ON public.manager_game_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game saves"
  ON public.manager_game_saves FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game saves"
  ON public.manager_game_saves FOR DELETE
  USING (auth.uid() = user_id);

-- 7. RLS 정책 - 챕터 로그
CREATE POLICY "Users can view own chapter logs"
  ON public.manager_chapter_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_game_saves
      WHERE id = manager_chapter_logs.game_save_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own chapter logs"
  ON public.manager_chapter_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manager_game_saves
      WHERE id = manager_chapter_logs.game_save_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own chapter logs"
  ON public.manager_chapter_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_game_saves
      WHERE id = manager_chapter_logs.game_save_id
      AND user_id = auth.uid()
    )
  );

-- 8. updated_at 트리거
CREATE TRIGGER update_manager_game_saves_updated_at
  BEFORE UPDATE ON public.manager_game_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();