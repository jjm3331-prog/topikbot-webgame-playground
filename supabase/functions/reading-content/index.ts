import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOPIK_READING_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 읽기]
어휘: 기초 800~1500개
문장: 짧고 명확, 기본 조사/어미
주제: 일상생활, 쇼핑, 교통`,

  "3-4": `[TOPIK 3-4급 읽기]
어휘: 중급 3000~5000개
문장: 복문, 연결어미 활용
주제: 사회, 직장, 교육, 문화`,

  "5-6": `[TOPIK 5-6급 읽기]
어휘: 고급 6000개 이상
문장: 문어체, 학술적 표현
주제: 학술, 정치, 경제, 사회 이슈`,
};

// 읽기 문제 유형별 프롬프트
const TAB_PROMPTS: Record<string, Record<string, string>> = {
  readingA: {
    grammar: "빈칸에 알맞은 조사/어미를 고르는 문법 문제",
    vocabulary: "유의어/반의어/의미를 묻는 어휘 문제",
    topic: "글의 주제/중심 내용을 파악하는 문제",
    match: "내용 일치/불일치를 묻는 문제",
    headline: "신문기사 제목과 본문 매칭 문제",
  },
  readingB: {
    order: "문장 배열 순서를 맞추는 문제",
    inference: "빈칸에 들어갈 내용을 추론하는 문제",
    linked: "연계 지문 문제 (2문제 1세트)",
    comprehensive: "종합 독해 문제",
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topikLevel = body.level || "1-2";
    const tab = body.tab || "readingA";
    const subTab = body.subTab || "grammar";
    const count = Math.min(Math.max(body.count || 5, 1), 10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 캐시 확인
    const cacheKey = `reading_${topikLevel}_${tab}_${subTab}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'reading-content')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      console.log(`[Reading] Cache HIT for ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        questions: cached.response,
        topikLevel,
        type: tab,
        tabType: subTab,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Reading] Generating ${count} questions for TOPIK ${topikLevel}, ${tab}/${subTab}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const tabPrompts = TAB_PROMPTS[tab] || TAB_PROMPTS.readingA;
    const questionType = tabPrompts[subTab] || tabPrompts.grammar;

    const systemPrompt = `당신은 한국어 TOPIK 읽기 시험 전문가입니다.
사용자: 베트남인 학습자

[규칙]
1. 출력은 오직 JSON 배열만 (마크다운 금지)
2. 베트남어 설명은 번역투 금지, 네이티브 표현
3. 난이도는 TOPIK ${topikLevel}급에 정확히 맞출 것

${TOPIK_READING_GUIDELINES[topikLevel] || TOPIK_READING_GUIDELINES["1-2"]}

[문제 유형]
${questionType}

[JSON 스키마]
{
  "id": 1,
  "passage": "지문 (한국어)",
  "question": "질문 (한국어)",
  "options": ["①선택지1", "②선택지2", "③선택지3", "④선택지4"],
  "answer": 0,
  "explanationKo": "해설 (한국어): 왜 정답인지 + 오답 분석",
  "explanationVi": "Giải thích (tiếng Việt tự nhiên)"
}`;

    const userPrompt = `TOPIK ${topikLevel}급 "${questionType}" 유형으로 ${count}개 읽기 문제를 JSON 배열로 생성하세요.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Reading] Lovable AI error:", response.status, errText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse reading JSON");
    }

    const questions = JSON.parse(jsonMatch[0]);

    // 캐시 저장 (30분 유효)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'reading-content',
      response: questions,
      request_params: { count, topikLevel, tab, subTab },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      questions,
      topikLevel,
      type: tab,
      tabType: subTab,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Reading] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
