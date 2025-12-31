-- Add win_streak column to profiles for tracking consecutive wins
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0;

-- Add max_win_streak to track best streak ever
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_win_streak integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.win_streak IS 'Current consecutive battle wins';
COMMENT ON COLUMN public.profiles.max_win_streak IS 'Best consecutive win streak ever achieved';