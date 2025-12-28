-- Create storage bucket for CSV files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-files', 'data-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from this bucket
CREATE POLICY "Anyone can read data files"
ON storage.objects FOR SELECT
USING (bucket_id = 'data-files');

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload data files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'data-files' AND has_role(auth.uid(), 'admin'::app_role));