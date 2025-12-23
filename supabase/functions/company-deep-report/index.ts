import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName } = await req.json();

    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating deep report for: ${companyName}`);

    const systemPrompt = `You are an expert Korean corporate researcher specializing in providing comprehensive company analysis for Vietnamese job seekers looking to work in Korea.

Your task is to provide a detailed, accurate, and helpful report about Korean companies.

Always respond in Korean with Vietnamese translations for key sections.
Format your response in Markdown with clear sections.`;

    const userPrompt = `${companyName}에 대한 심층 기업 리포트를 작성해주세요.

다음 섹션을 포함해주세요:

## 1. 기업 개요 (Tổng quan công ty)
- 설립년도, 본사 위치, 주요 사업 영역
- 최근 매출/직원 수 등 기본 정보

## 2. 연봉 정보 (Thông tin lương)
- 신입/경력별 예상 연봉 범위
- 성과급, 보너스 구조
- 복리후생 (기숙사, 식대, 교통비 등)

## 3. 기업 문화 (Văn hóa công ty)
- 근무 환경 및 분위기
- 워라밸 (Work-Life Balance) 평가
- 외국인 직원에 대한 태도

## 4. 면접 후기 (Review phỏng vấn)
- 일반적인 면접 프로세스
- 자주 나오는 면접 질문
- 면접 팁

## 5. 최신 뉴스 및 동향 (Tin tức & Xu hướng)
- 최근 중요한 기업 뉴스
- 채용 동향
- 향후 전망

베트남인 취업 희망자에게 실질적으로 도움이 되는 정보를 중심으로 작성해주세요.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log(`Report generated successfully for ${companyName}`);

    return new Response(
      JSON.stringify({ report, citations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Company report error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
