-- Drop existing RLS policies for reviews
DROP POLICY IF EXISTS "Users can create their own review" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own review" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own review" ON public.reviews;

-- Modify reviews table to allow anonymous submissions
ALTER TABLE public.reviews 
ALTER COLUMN user_id DROP NOT NULL;

-- Create new RLS policies for anonymous reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own review" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own review" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = user_id);