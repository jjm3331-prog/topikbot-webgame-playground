-- Speed Quiz 1:1 realtime state tables

CREATE TABLE IF NOT EXISTS public.speed_quiz_room_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  question_number integer NOT NULL,
  question jsonb NOT NULL,
  started_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_speed_quiz_room_questions_room_number
  ON public.speed_quiz_room_questions (room_id, question_number);

CREATE TABLE IF NOT EXISTS public.speed_quiz_room_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  question_number integer NOT NULL,
  user_id uuid NOT NULL,
  selected_index integer NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  time_left_seconds integer NULL,
  is_correct boolean NULL,
  score_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, question_number, user_id)
);

CREATE INDEX IF NOT EXISTS idx_speed_quiz_room_answers_room_number
  ON public.speed_quiz_room_answers (room_id, question_number);

CREATE INDEX IF NOT EXISTS idx_speed_quiz_room_answers_user
  ON public.speed_quiz_room_answers (user_id);

-- Realtime support
ALTER TABLE public.speed_quiz_room_questions REPLICA IDENTITY FULL;
ALTER TABLE public.speed_quiz_room_answers REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_quiz_room_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_quiz_room_answers;

-- RLS
ALTER TABLE public.speed_quiz_room_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_quiz_room_answers ENABLE ROW LEVEL SECURITY;

-- Participants: host or guest of the room (speed_quiz)
CREATE POLICY "Speed quiz participants can read questions"
ON public.speed_quiz_room_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
  )
);

CREATE POLICY "Speed quiz host can write questions"
ON public.speed_quiz_room_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND r.host_id = auth.uid()
  )
);

CREATE POLICY "Speed quiz host can update questions"
ON public.speed_quiz_room_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND r.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND r.host_id = auth.uid()
  )
);

CREATE POLICY "Speed quiz participants can read answers"
ON public.speed_quiz_room_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
  )
);

CREATE POLICY "Speed quiz participants can submit their answer"
ON public.speed_quiz_room_answers
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chain_reaction_rooms r
    WHERE r.id = room_id
      AND r.connection_mode = 'speed_quiz'
      AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
  )
);

-- Allow a user to update ONLY their own answer row (e.g., if we late-fill correctness/score_delta client-side)
CREATE POLICY "Speed quiz participants can update own answer"
ON public.speed_quiz_room_answers
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
