-- 헤드헌팅 신청 테이블 생성
CREATE TABLE public.headhunting_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birth_year INTEGER,
  nationality TEXT DEFAULT 'Vietnamese',
  
  -- 학력
  education_level TEXT, -- 고졸, 대졸, 석사, 박사
  university_name TEXT,
  major TEXT,
  graduation_year INTEGER,
  
  -- 한국어 능력
  topik_level INTEGER, -- 1-6
  korean_certificate_other TEXT,
  
  -- 경력
  work_experience_years INTEGER DEFAULT 0,
  current_job_title TEXT,
  current_company TEXT,
  work_experience_details TEXT,
  
  -- 희망 사항
  desired_job_type TEXT, -- 정규직, 계약직, 인턴 등
  desired_industry TEXT, -- IT, 제조, 서비스, 무역 등
  desired_location TEXT, -- 한국, 베트남 내 한국기업
  desired_salary_range TEXT,
  available_start_date DATE,
  
  -- 자기소개 및 추가 정보
  introduction TEXT,
  strengths TEXT,
  career_goals TEXT,
  additional_skills TEXT,
  
  -- 파일 URL (이력서, 자기소개서 등)
  resume_url TEXT,
  cover_letter_url TEXT,
  portfolio_url TEXT,
  
  -- 상태 관리
  status TEXT DEFAULT 'pending', -- pending, reviewing, matched, hired, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.headhunting_applications ENABLE ROW LEVEL SECURITY;

-- 사용자 정책: 본인 신청서만 조회/수정 가능
CREATE POLICY "Users can view own applications"
ON public.headhunting_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
ON public.headhunting_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
ON public.headhunting_applications
FOR UPDATE
USING (auth.uid() = user_id);

-- 관리자 정책: 모든 신청서 관리 가능
CREATE POLICY "Admins can view all applications"
ON public.headhunting_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all applications"
ON public.headhunting_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_headhunting_applications_updated_at
BEFORE UPDATE ON public.headhunting_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 실시간 업데이트 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.headhunting_applications;