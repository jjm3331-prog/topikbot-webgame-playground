-- Create table to track feature usage for daily limits
CREATE TABLE public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_feature_usage_user_feature ON public.feature_usage(user_id, feature_name, used_at);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own feature usage"
ON public.feature_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert own feature usage"
ON public.feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to check if user can use a feature (Free users: 1/day, Premium: unlimited)
CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id UUID, _feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    -- Premium users always can use
    CASE WHEN is_premium(_user_id) THEN true
    ELSE
      -- Free users: check if used in last 24 hours
      NOT EXISTS (
        SELECT 1 FROM public.feature_usage
        WHERE user_id = _user_id
          AND feature_name = _feature_name
          AND used_at > now() - INTERVAL '24 hours'
      )
    END
$$;

-- Create function to record feature usage
CREATE OR REPLACE FUNCTION public.record_feature_usage(_user_id UUID, _feature_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.feature_usage (user_id, feature_name, used_at)
  VALUES (_user_id, _feature_name, now());
END;
$$;

-- Create function to get remaining time until next use (in seconds)
CREATE OR REPLACE FUNCTION public.get_feature_cooldown(_user_id UUID, _feature_name TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE WHEN is_premium(_user_id) THEN 0
    ELSE
      COALESCE(
        (
          SELECT GREATEST(0, EXTRACT(EPOCH FROM (used_at + INTERVAL '24 hours' - now()))::INTEGER)
          FROM public.feature_usage
          WHERE user_id = _user_id
            AND feature_name = _feature_name
          ORDER BY used_at DESC
          LIMIT 1
        ),
        0
      )
    END
$$;