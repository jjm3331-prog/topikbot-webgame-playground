-- Create realtime move log table for Chain Reaction multiplayer
CREATE TABLE IF NOT EXISTS public.chain_reaction_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  word TEXT NOT NULL,
  connection_mode TEXT NOT NULL DEFAULT 'semantic',
  chain_length INTEGER NOT NULL DEFAULT 1,
  score_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic index for fast room timeline reads
CREATE INDEX IF NOT EXISTS idx_chain_reaction_moves_room_time
  ON public.chain_reaction_moves (room_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.chain_reaction_moves ENABLE ROW LEVEL SECURITY;

-- Public multiplayer: allow anyone to read & insert moves (no PII stored)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chain_reaction_moves' AND policyname='Anyone can view moves'
  ) THEN
    CREATE POLICY "Anyone can view moves"
    ON public.chain_reaction_moves
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chain_reaction_moves' AND policyname='Anyone can insert moves'
  ) THEN
    CREATE POLICY "Anyone can insert moves"
    ON public.chain_reaction_moves
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure realtime provides full payloads if needed
ALTER TABLE public.chain_reaction_moves REPLICA IDENTITY FULL;

-- Add to realtime publication (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chain_reaction_moves;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;