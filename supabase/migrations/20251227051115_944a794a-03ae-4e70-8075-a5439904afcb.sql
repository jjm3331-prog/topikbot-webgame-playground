-- Add 'podcast' to board_type enum
ALTER TYPE public.board_type ADD VALUE IF NOT EXISTS 'podcast';

-- Create storage bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-audio', 'podcast-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for public read access
CREATE POLICY "Public read podcast audio" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'podcast-audio');

-- Create policy for authenticated users to upload audio
CREATE POLICY "Authenticated users can upload podcast audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'podcast-audio' AND auth.role() = 'authenticated');

-- Create policy for users to delete their own uploads
CREATE POLICY "Users can delete own podcast audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'podcast-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add audio_url column to board_posts table for podcast audio files
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS audio_url TEXT;