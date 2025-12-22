-- Create storage bucket for resumes and cover letters
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for resume uploads
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all resumes
CREATE POLICY "Admins can view all resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'));