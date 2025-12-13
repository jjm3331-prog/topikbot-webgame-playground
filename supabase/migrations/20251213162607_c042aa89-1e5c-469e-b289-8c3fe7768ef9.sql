-- AI 응답 캐시 테이블 생성
CREATE TABLE public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  request_params JSONB,
  response JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- 캐시 키 인덱스 (빠른 조회)
CREATE UNIQUE INDEX idx_ai_cache_key ON public.ai_response_cache (function_name, cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache (expires_at);

-- 만료된 캐시 자동 정리 함수
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
END;
$$;

-- RLS 비활성화 (Edge Function에서만 접근)
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Service Role만 접근 가능
CREATE POLICY "Service role full access" 
ON public.ai_response_cache 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 캐시 히트 업데이트 함수
CREATE OR REPLACE FUNCTION public.increment_cache_hit(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_response_cache SET hit_count = hit_count + 1 WHERE id = p_id;
END;
$$;