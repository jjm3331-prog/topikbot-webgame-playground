-- Create game_records table to store player battle records
CREATE TABLE public.game_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL, -- 'chain_reaction' or 'semantic_battle'
  opponent_id UUID,
  opponent_name TEXT,
  result TEXT NOT NULL, -- 'win', 'lose', 'draw'
  my_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  room_id UUID,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_game_records_user_id ON public.game_records(user_id);
CREATE INDEX idx_game_records_played_at ON public.game_records(played_at DESC);

-- Enable RLS
ALTER TABLE public.game_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own game records"
ON public.game_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game records"
ON public.game_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add game stats columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS battle_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS battle_losses INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS battle_draws INTEGER NOT NULL DEFAULT 0;