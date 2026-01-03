-- Create kpop_lyrics table for K-Pop MV quiz
CREATE TABLE public.kpop_lyrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist TEXT NOT NULL,
  song TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT 0,
  lyric_line TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 15,
  genre TEXT DEFAULT 'kpop',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpop_lyrics ENABLE ROW LEVEL SECURITY;

-- Anyone can read active lyrics
CREATE POLICY "Anyone can read active kpop lyrics"
ON public.kpop_lyrics
FOR SELECT
USING (is_active = true);

-- Admins can manage lyrics
CREATE POLICY "Admins can manage kpop lyrics"
ON public.kpop_lyrics
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add sample data (artists with valid YouTube MV links)
INSERT INTO public.kpop_lyrics (artist, song, youtube_id, timestamp, lyric_line, answer, hint, difficulty, points) VALUES
('BTS', 'Dynamite', 'gdZLi9oWNZg', 60, '____을 밝혀줘 like dynamite', '불꽃', '불… (2자)', 'easy', 10),
('BTS', 'Butter', 'WMweEpGlu_U', 45, 'Smooth like ____, like a criminal undercover', 'butter', 'b… (6자)', 'easy', 10),
('BLACKPINK', 'DDU-DU DDU-DU', 'IHNzOHi8sJs', 55, '____ 쳐다보지 마 전부 다 fake', '날', '나… (1자)', 'medium', 15),
('BLACKPINK', 'How You Like That', 'ioNng23DkIM', 70, 'Look up in the ____ it''s a bird it''s a plane', 'sky', 's… (3자)', 'easy', 10),
('NewJeans', 'Hype Boy', 'YB_sxc-n6jM', 40, 'I was good I was fine till I ____ you', 'met', 'm… (3자)', 'medium', 15),
('NewJeans', 'OMG', 'sVTy_wmn5SU', 35, 'O-M-G don''t you know I ____', 'like', 'l… (4자)', 'easy', 10),
('aespa', 'Next Level', 'gPJT_hfqKYI', 50, 'Watch me while I ____ it bring it to the next level', 'work', 'w… (4자)', 'medium', 15),
('TWICE', 'Feel Special', 'c9T0_qnPNwE', 65, 'You make me feel ____', 'special', 's… (7자)', 'easy', 10),
('Stray Kids', 'God''s Menu', 'YaYxDFBYEwM', 40, '____에서 요리해 jikihae', '부엌', '부… (2자)', 'hard', 25),
('IVE', 'LOVE DIVE', 'Ynp2rfJEuVE', 55, 'Narcissistic my god I ____ it', 'love', 'l… (4자)', 'easy', 10);