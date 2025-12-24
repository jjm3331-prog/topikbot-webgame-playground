import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `당신은 한국어 학습 게임을 위한 단어 생성기입니다.
플레이어가 타이핑 연습을 할 수 있도록 한국어 단어를 생성합니다.

## 단어 생성 규칙

### 난이도별 기준
- easy (쉬움): 1-3글자 단어, 일상적이고 기초적인 단어
  - 예: 밥, 물, 집, 책, 친구, 학교, 사랑, 음식
  - 포인트: 40-60

- medium (보통): 3-5글자 단어, 일상생활에서 자주 쓰는 단어
  - 예: 편의점, 지하철, 도서관, 컴퓨터, 핸드폰, 아이스크림
  - 포인트: 70-100

- hard (어려움): 5글자 이상, 복합어/긴 표현/전문용어
  - 예: 무궁화꽃이피었습니다, 한국어능력시험, 외국인등록증, 신용카드결제
  - 포인트: 120-200

## 주제 다양성 (모든 난이도에서 골고루)
- 음식/요리
- 장소/건물
- 기술/IT
- 교통/이동
- 쇼핑/경제
- 문화/엔터테인먼트
- 일상생활
- 학교/직장
- 감정/표현
- 한국 문화 특유 표현 (MZ세대 용어, 인터넷 신조어 포함)

## 응답 형식 (반드시 JSON 배열로만 응답)
[
  {
    "korean": "한국어 단어",
    "vietnamese": "Nghĩa tiếng Việt",
    "points": 숫자 (난이도에 맞게)
  },
  ...
]

## 중요
- 매번 완전히 다른 단어를 생성하세요
- 다양한 주제에서 골고루 선택
- 실제 한국에서 사용하는 자연스러운 단어
- 학습에 도움이 되는 실용적인 단어
- MZ세대 신조어, 줄임말도 포함 (예: 갓생, 혼밥, 존맛, 꿀잼)
- 베트남어 번역은 정확하고 자연스럽게`;

// Input validation helpers
function validateDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (value === 'easy' || value === 'hard') return value;
  return 'medium';
}

function validateNumber(value: unknown, min: number, max: number): number {
  const num = typeof value === 'number' ? value : min;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateExcludeList(exclude: unknown): string[] {
  if (!Array.isArray(exclude)) return [];
  return exclude
    .map(e => validateString(e, 50))
    .filter((e): e is string => e !== null)
    .slice(-100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Validate inputs
    const difficulty = validateDifficulty(body.difficulty);
    const count = validateNumber(body.count, 1, 20);
    const exclude = validateExcludeList(body.exclude);
    const skipCache: boolean = body.skipCache ?? false;

    // Supabase 클라이언트 생성
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 키 생성
    const cacheKey = `typing_${difficulty}_${count}`;
    
    // 캐시 확인 (skipCache가 false이고 exclude가 비어있을 때만)
    if (!skipCache && exclude.length === 0) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'typing-words')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`⚡ Cache HIT for ${cacheKey}`);
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        
        return new Response(JSON.stringify({ words: cached.response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`💨 Cache MISS for ${cacheKey}`);
    }
    
    console.log(`Generating ${count} words for difficulty: ${difficulty}`);

    const excludeText = exclude.length > 0 
      ? `\n\n제외할 단어 (이미 나온 단어들): ${exclude.join(', ')}` 
      : '';

    const userPrompt = `난이도: ${difficulty}
생성할 단어 수: ${count}개
${excludeText}

위 조건에 맞는 한국어 단어를 생성해주세요. 다양한 주제에서 골고루 선택하고, 매번 새로운 단어를 사용하세요.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let parsedResponse;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback words
      parsedResponse = [
        { korean: "한국어", vietnamese: "Tiếng Hàn", points: 70 },
        { korean: "공부", vietnamese: "Học tập", points: 50 },
        { korean: "게임", vietnamese: "Trò chơi", points: 50 },
      ];
    }

    // 캐시에 저장 (1시간 유효, exclude가 비어있을 때만)
    if (exclude.length === 0) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await supabase.from('ai_response_cache').upsert({
        cache_key: cacheKey,
        function_name: 'typing-words',
        response: parsedResponse,
        request_params: { difficulty, count },
        expires_at: expiresAt,
        hit_count: 0,
      }, { onConflict: 'cache_key' });
      console.log(`💾 Cached result for ${cacheKey}`);
    }

    return new Response(JSON.stringify({ words: parsedResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in typing-words function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
