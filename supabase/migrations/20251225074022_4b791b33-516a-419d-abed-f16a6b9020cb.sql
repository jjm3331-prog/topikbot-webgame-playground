-- Create board type enum
CREATE TYPE public.board_type AS ENUM ('notice', 'free', 'resource', 'anonymous');

-- Create board posts table
CREATE TABLE public.board_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_type board_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT, -- For anonymous posts
  is_anonymous BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  attachment_urls TEXT[] DEFAULT '{}',
  youtube_urls TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create board comments table (supports nested comments)
CREATE TABLE public.board_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.board_comments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT, -- For anonymous comments
  is_anonymous BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create board likes table
CREATE TABLE public.board_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.board_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_post_like UNIQUE (user_id, post_id),
  CONSTRAINT unique_comment_like UNIQUE (user_id, comment_id),
  CONSTRAINT must_have_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_likes ENABLE ROW LEVEL SECURITY;

-- Board posts policies
-- Everyone can read all posts
CREATE POLICY "Anyone can view posts" 
ON public.board_posts 
FOR SELECT 
USING (true);

-- Authenticated users can create posts (notice board requires admin check in app)
CREATE POLICY "Authenticated users can create posts" 
ON public.board_posts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Users can update their own posts
CREATE POLICY "Users can update own posts" 
ON public.board_posts 
FOR UPDATE 
TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts" 
ON public.board_posts 
FOR DELETE 
TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Board comments policies
CREATE POLICY "Anyone can view comments" 
ON public.board_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create comments" 
ON public.board_comments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own comments" 
ON public.board_comments 
FOR UPDATE 
TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own comments" 
ON public.board_comments 
FOR DELETE 
TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Board likes policies
CREATE POLICY "Anyone can view likes" 
ON public.board_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like" 
ON public.board_likes 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own likes" 
ON public.board_likes 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_board_posts_board_type ON public.board_posts(board_type);
CREATE INDEX idx_board_posts_created_at ON public.board_posts(created_at DESC);
CREATE INDEX idx_board_posts_author_id ON public.board_posts(author_id);
CREATE INDEX idx_board_comments_post_id ON public.board_comments(post_id);
CREATE INDEX idx_board_comments_parent_id ON public.board_comments(parent_id);
CREATE INDEX idx_board_likes_post_id ON public.board_likes(post_id);
CREATE INDEX idx_board_likes_comment_id ON public.board_likes(comment_id);

-- Create trigger for updated_at
CREATE TRIGGER update_board_posts_updated_at
BEFORE UPDATE ON public.board_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_board_comments_updated_at
BEFORE UPDATE ON public.board_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for board attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('board-attachments', 'board-attachments', true);

-- Storage policies for board attachments
CREATE POLICY "Anyone can view board attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'board-attachments');

CREATE POLICY "Authenticated users can upload board attachments" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'board-attachments');

CREATE POLICY "Users can delete own board attachments" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'board-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);