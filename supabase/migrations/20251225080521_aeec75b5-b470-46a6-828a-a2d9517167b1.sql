-- Create board_reports table for report functionality
CREATE TABLE public.board_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.board_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.board_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT must_have_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.board_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can create reports" 
ON public.board_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" 
ON public.board_reports 
FOR SELECT 
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" 
ON public.board_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports" 
ON public.board_reports 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_board_reports_updated_at
BEFORE UPDATE ON public.board_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for board tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_comments;