import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 정교한 시스템 프롬프트 - 정확성과 교육적 가치 최우선
const SYSTEM_PROMPT = `당신은 한국어 교육 전문가이자 TOPIK 시험 출제위원 수준의 콘텐츠 제작자입니다.

## 핵심 원칙
1. **정확성 최우선**: 모든 한국어 표현, 문법 설명, 예문은 100% 정확해야 합니다
2. **TOPIK 기준 준수**: 해당 레벨에 맞는 어휘와 문법만 사용하세요
3. **실용성**: 실생활에서 바로 활용 가능한 내용을 우선하세요
4. **체계성**: 학습 단계를 고려한 점진적 난이도 구성

## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
{
  "questions": [
    {
      "id": 1,
      "question": "영어로 된 질문",
      "questionKo": "한국어로 된 질문",
      "options": [
        {"label": "선택지1", "value": "a"},
        {"label": "선택지2", "value": "b"},
        {"label": "선택지3", "value": "c"},
        {"label": "선택지4", "value": "d"}
      ],
      "correctAnswer": "정답 value (a/b/c/d)",
      "explanation": "영어 해설",
      "explanationKo": "한국어 해설"
    }
  ]
}

## 카테고리별 문제 유형

### vocabulary (어휘)
- 단어 의미 파악
- 유의어/반의어
- 문맥에 맞는 어휘 선택
- 한자어 vs 고유어 구분

### grammar (문법)
- 조사 사용 (은/는, 이/가, 을/를, 에/에서 등)
- 어미 활용 (-아요/어요, -았/었-, -겠-, -ㄹ 거예요 등)
- 문장 구조 (주어-목적어-서술어)
- 높임법 (격식체/비격식체, 존칭)

### reading (읽기)
- 지문 이해
- 중심 내용 파악
- 세부 정보 찾기
- 글의 목적/의도 파악

### listening (듣기)
- 대화 상황 파악
- 화자의 의도 이해
- 장소/시간/인물 추론
- 안내 방송 이해

### mock_test (모의고사)
- 실제 TOPIK 형식
- 통합 유형 문제
- 시간 제한 연습

## 레벨별 기준

### Level 1-2 (TOPIK I)
- 기초 어휘 800-1500개
- 기본 문법 (현재/과거시제, 기본 조사)
- 일상 대화 주제

### Level 3-4 (TOPIK II 중급)
- 어휘 3000-5000개
- 복합 문법 (-면서, -기 때문에, -ㄴ/은 것 같다)
- 사회적 주제 (뉴스, 사설)

### Level 5-6 (TOPIK II 고급)
- 어휘 6000개 이상
- 고급 문법 (-는 바, -기 마련이다, -는 셈이다)
- 전문적/학술적 주제

정확히 5개의 문제를 생성하세요.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonId, category, level, title } = await req.json();

    if (!lessonId || !category || !level) {
      return new Response(JSON.stringify({ error: 'lessonId, category, level are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 확인 (4시간 유효)
    const cacheKey = `lesson_${lessonId}_${category}_${level}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'lesson-content')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`[Lesson] Cache HIT for ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        questions: cached.response,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gemini 2.5 Flash 직접 호출
    const userPrompt = `## 요청
레슨 ID: ${lessonId}
카테고리: ${category}
레벨: ${level}
제목: ${title || '일반'}

TOPIK Level ${level}에 적합한 ${category} 문제 5개를 생성하세요.`;

    console.log('[Lesson] Calling Gemini 2.5 Flash');

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Lesson] Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Lesson] AI response received, parsing JSON');

    // Parse JSON from response
    let questions;
    try {
      const parsed = JSON.parse(content);
      questions = parsed.questions || parsed;
    } catch (parseError) {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr.trim());
        questions = parsed.questions || parsed;
      } else {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content.substring(0, 500));
        return new Response(JSON.stringify({ 
          error: 'Failed to parse AI response',
          raw: content.substring(0, 500)
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 캐시에 저장 (4시간 유효)
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'lesson-content',
      response: questions,
      request_params: { lessonId, category, level, title },
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      questions,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Lesson] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
