-- Fix ai_response_cache upsert by adding required unique constraint
-- This enables ON CONFLICT (function_name, cache_key) DO UPDATE

ALTER TABLE public.ai_response_cache
  ADD CONSTRAINT ai_response_cache_function_cache_key_unique
  UNIQUE (function_name, cache_key);

-- Optional performance indexes
CREATE INDEX IF NOT EXISTS ai_response_cache_expires_at_idx
  ON public.ai_response_cache (expires_at);

CREATE INDEX IF NOT EXISTS ai_response_cache_function_name_idx
  ON public.ai_response_cache (function_name);

CREATE INDEX IF NOT EXISTS ai_response_cache_cache_key_idx
  ON public.ai_response_cache (cache_key);