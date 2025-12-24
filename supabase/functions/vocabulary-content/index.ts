import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOPIK 급수별 어휘 가이드라인
const TOPIK_VOCAB_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 어휘 가이드라인]
수준: 기초 어휘 800~1500개
카테고리:
- 일상생활: 가족, 음식, 날씨, 시간, 장소, 쇼핑
- 기본 동사: 가다, 오다, 먹다, 마시다, 자다, 일어나다
- 기본 형용사: 좋다, 크다, 작다, 많다, 예쁘다
- 숫자, 요일, 색깔
예시: 학교, 친구, 음식, 사과, 커피, 책, 가방`,

  "3-4": `[TOPIK 3-4급 어휘 가이드라인]
수준: 중급 어휘 3000~5000개
카테고리:
- 사회생활: 직장, 교육, 건강, 환경, 경제
- 추상 개념: 경험, 문화, 관계, 발전, 변화
- 한자어: 학생(學生), 회사(會社), 시간(時間)
- 관용 표현: ~에 따르면, ~에 비해, ~를 통해
예시: 경험, 문화, 환경, 발전, 관계, 정보, 기회`,

  "5-6": `[TOPIK 5-6급 어휘 가이드라인]
수준: 고급 어휘 6000개 이상
카테고리:
- 학술/전문: 지속가능성, 패러다임, 인프라, 메커니즘
- 추상 개념: 본질, 함의, 맥락, 전제, 귀결, 타당성
- 사회/정치: 양극화, 담론, 인식, 관점, 논거
- 관용어/속담: 빈 수레가 요란하다, 물의를 일으키다
예시: 지속가능성, 패러다임, 양극화, 본질, 함의, 맥락`,
};

// Gemini로 어휘 생성
async function generateVocabulary(
  count: number,
  geminiApiKey: string,
  topikLevel: string
): Promise<any[]> {
  const guideline = TOPIK_VOCAB_GUIDELINES[topikLevel] || TOPIK_VOCAB_GUIDELINES["1-2"];

  const prompt = `당신은 TOPIK(한국어능력시험) 어휘 전문가입니다.
베트남어 학습자를 위한 한국어 단어 ${count}개를 생성하세요.

${guideline}

[필수 요구사항]
1. 각 단어는 반드시 다음 JSON 형식:
{
  "id": 숫자,
  "korean": "한국어 단어",
  "meaning": "베트남어 뜻",
  "pronunciation": "발음 가이드 (선택)",
  "example": "예문 (한국어)",
  "exampleMeaning": "예문 뜻 (베트남어)"
}

2. 중요 규칙:
- 반드시 ${topikLevel}급 수준에 맞는 단어 선택
- 베트남어 번역은 정확하고 자연스럽게
- 예문은 일상에서 자주 사용하는 문장으로
- 중복 없이 다양한 카테고리에서 선택

3. 베트남어 번역 품질:
- 단순한 사전 번역이 아닌 실제 사용되는 표현
- 뉘앙스를 정확히 전달

반드시 JSON 배열만 반환하세요.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 12, topikLevel = '1-2', skipCache = false } = await req.json();
    
    console.log(`📚 Vocabulary Content: level=${topikLevel}, count=${count}`);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('Missing GEMINI_API_KEY');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured',
        words: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 키 생성
    const cacheKey = `vocabulary_${topikLevel}_${count}`;
    
    // 캐시 확인
    if (!skipCache) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'vocabulary-content')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`⚡ Cache HIT for ${cacheKey}`);
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
      console.log(`💨 Cache MISS for ${cacheKey}`);
    }

    // Gemini로 단어 생성
    console.log(`📝 Generating ${count} vocabulary words for TOPIK ${topikLevel}`);
    const words = await generateVocabulary(count, geminiApiKey, topikLevel);
    
    console.log(`✨ Generated ${words.length} words`);

    // 캐시에 저장 (30분 유효)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'vocabulary-content',
      response: words,
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });
    console.log(`💾 Cached result for ${cacheKey}`);

    return new Response(JSON.stringify({
      success: true,
      words,
      topikLevel,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Vocabulary content error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      words: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
