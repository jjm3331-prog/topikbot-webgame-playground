-- Create storage buckets for mock exam audio and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-exam-audio', 'mock-exam-audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-exam-images', 'mock-exam-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mock-exam-audio bucket
CREATE POLICY "Public read access for mock-exam-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'mock-exam-audio');

CREATE POLICY "Admin upload for mock-exam-audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mock-exam-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete for mock-exam-audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mock-exam-audio' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Storage policies for mock-exam-images bucket
CREATE POLICY "Public read access for mock-exam-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'mock-exam-images');

CREATE POLICY "Admin upload for mock-exam-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mock-exam-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete for mock-exam-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mock-exam-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);