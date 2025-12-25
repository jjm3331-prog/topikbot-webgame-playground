-- Add turn-based fields to chain_reaction_rooms
ALTER TABLE public.chain_reaction_rooms
  ADD COLUMN IF NOT EXISTS current_turn_player_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS turn_start_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS host_warnings INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_warnings INTEGER NOT NULL DEFAULT 0;