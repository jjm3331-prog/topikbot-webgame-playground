import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 캐싱용 시스템 프롬프트 (고정)
const SYSTEM_PROMPT_BASE = `당신은 한국어 TOPIK 어휘 교육 전문가입니다.
사용자: 베트남인 학습자

[규칙]
1. 출력은 오직 JSON 배열만 (마크다운 금지)
2. 베트남어 번역은 네이티브 표현으로
3. 난이도를 TOPIK 레벨에 정확히 맞출 것

[JSON 스키마]
{
  "id": 1,
  "korean": "한국어 단어",
  "meaning": "베트남어 뜻",
  "pronunciation": "발음 표기",
  "example": "예문 (한국어)",
  "exampleMeaning": "예문 번역 (베트남어)"
}`;

const TOPIK_VOCAB_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 어휘]
수준: 기초 어휘 800~1500개
카테고리: 일상생활 (가족, 음식, 날씨, 시간, 장소, 쇼핑)
예시: 학교, 친구, 음식, 사과, 커피, 책, 가방`,

  "3-4": `[TOPIK 3-4급 어휘]
수준: 중급 어휘 3000~5000개
카테고리: 사회생활 (직장, 교육, 건강, 환경, 경제)
예시: 경험, 문화, 환경, 발전, 관계, 정보, 기회`,

  "5-6": `[TOPIK 5-6급 어휘]
수준: 고급 어휘 6000개 이상
카테고리: 학술/전문 (지속가능성, 패러다임, 인프라)
예시: 양극화, 담론, 인식, 관점, 논거, 함의`,
};

const VOCAB_CATEGORIES: Record<string, string[]> = {
  "1-2": ["가족과 관계", "음식과 요리", "날씨와 계절", "쇼핑과 물건", "교통과 장소"],
  "3-4": ["직장과 업무", "건강과 의료", "환경과 사회", "교육과 학습", "경제와 금융"],
  "5-6": ["정치와 사회", "과학과 기술", "문화와 예술", "경제와 산업", "학술과 연구"],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topikLevel = body.level || "1-2";
    const count = Math.min(Math.max(body.count || 10, 1), 30);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 캐시 확인 (4시간 유효)
    const cacheKey = `vocab_${topikLevel}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'vocabulary-content')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      console.log(`[Vocab] Cache HIT for ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        words: cached.response,
        topikLevel,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Vocab] Generating ${count} words for TOPIK ${topikLevel}`);

    const categories = VOCAB_CATEGORIES[topikLevel] || VOCAB_CATEGORIES["1-2"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = `${SYSTEM_PROMPT_BASE}

${TOPIK_VOCAB_GUIDELINES[topikLevel] || TOPIK_VOCAB_GUIDELINES["1-2"]}`;

    const userPrompt = `"${randomCategory}" 카테고리에서 TOPIK ${topikLevel}급 수준 단어 ${count}개를 JSON 배열로 생성하세요.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Vocab] Gemini API error:", response.status, errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let words;
    try {
      words = JSON.parse(content);
      if (!Array.isArray(words)) {
        words = words.words || words.data || [];
      }
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse vocabulary JSON");
      }
      words = JSON.parse(jsonMatch[0]);
    }

    // 캐시 저장 (4시간 유효)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'vocabulary-content',
      response: words,
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      words,
      topikLevel,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Vocab] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
