import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TOPIK 급수별 어휘/문법 가이드라인 (캐싱용 시스템 프롬프트)
const SYSTEM_PROMPT_BASE = `당신은 한국어 TOPIK 시험 전문가입니다.
사용자: 베트남인 학습자

[엄격한 규칙]
1. 출력은 오직 JSON 배열만 (마크다운 금지)
2. 베트남어 설명은 번역투 금지, 네이티브 표현
3. 난이도를 정확히 맞출 것

[JSON 스키마]
{
  "type": "dialogue" | "single",
  "speaker1Text": "첫 번째 화자 대사 (한국어)",
  "speaker2Text": "두 번째 화자 대사 (dialogue만, 한국어)",
  "question": "질문 (한국어)",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "answer": 0,
  "explanation": "왜 정답인지 설명 (한국어)",
  "explanationVi": "Giải thích (tiếng Việt tự nhiên)"
}`;

const TOPIK_LEVEL_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 듣기 가이드라인]
어휘: 기초 어휘 800~1500개 범위 (가족, 음식, 날씨, 시간, 장소)
문법: 기본 조사 (이/가, 을/를, 은/는, 에, 에서), 기본 어미 (-습니다, -아요/-어요)
대화 특성: 짧고 명확한 문장, 일상 대화 상황`,

  "3-4": `[TOPIK 3-4급 듣기 가이드라인]
어휘: 중급 어휘 3000~5000개 (사회, 직장, 건강, 교육, 경제)
문법: 연결어미 (-는데, -으면, -아도), 추측 표현 (-것 같다)
대화 특성: 의견 교환, 간단한 설명, 뉴스/광고 이해`,

  "5-6": `[TOPIK 5-6급 듣기 가이드라인]
어휘: 고급 어휘 6000개 이상 (학술, 전문용어, 관용어)
문법: 고급 연결어미 (-거니와, -는다손 치더라도), 문어체 표현
대화 특성: 토론, 학술 발표, 뉴스 인터뷰, 반박/양보 표현`
};

interface Question {
  type: "dialogue" | "single";
  speaker1Text: string;
  speaker2Text?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  explanationVi: string;
}

// Gemini 2.5 Flash 직접 호출 (Context Caching 적용)
async function generateListeningQuestions(
  count: number,
  topikLevel: string
): Promise<Question[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const levelGuideline = TOPIK_LEVEL_GUIDELINES[topikLevel] || TOPIK_LEVEL_GUIDELINES["1-2"];
  const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${levelGuideline}`;

  const userPrompt = `TOPIK ${topikLevel}급 수준으로 ${count}개의 듣기 문제를 JSON 배열로 생성하세요.
dialogue(대화형)과 single(발표/안내형)을 적절히 섞어주세요.
반드시 ${topikLevel}급에 맞는 어휘와 문법만 사용하세요.`;

  console.log(`[Listening] Calling Gemini 2.5 Flash for ${count} questions, TOPIK ${topikLevel}`);

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
        // Context Caching: cachedContent 자동 활성화 (Gemini API 서버측 캐싱)
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Listening] Gemini API error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // JSON 파싱
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  
  return [];
}

// 폴백 문제
const FALLBACK_QUESTIONS: Question[] = [
  {
    type: "dialogue",
    speaker1Text: "안녕하세요. 뭘 찾으세요?",
    speaker2Text: "네, 사과 있어요?",
    question: "여자는 무엇을 찾고 있습니까?",
    options: ["배", "사과", "바나나", "오렌지"],
    answer: 1,
    explanation: "여자가 '사과 있어요?'라고 물었습니다.",
    explanationVi: "Người phụ nữ hỏi 'Có táo không?' nên đáp án là táo."
  },
  {
    type: "single",
    speaker1Text: "오늘 날씨는 맑고 기온은 25도입니다. 오후에는 비가 올 수 있습니다.",
    question: "오늘 오후 날씨는 어떻습니까?",
    options: ["맑음", "흐림", "비 가능성", "눈"],
    answer: 2,
    explanation: "오후에는 비가 올 수 있다고 했습니다.",
    explanationVi: "Tin thời tiết nói buổi chiều có thể mưa, nên đáp án là 'có thể mưa'."
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 5, 1), 20);
    const topikLevel = body.level || "1-2";

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 캐시 확인 (4시간 유효 - 비용 절감)
    const cacheKey = `listening_${topikLevel}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'listening-content')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached) {
      console.log(`[Listening] Cache HIT for ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      
      return new Response(JSON.stringify({
        success: true,
        questions: cached.response,
        source: 'cache',
        topikLevel,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Listening] Generating ${count} questions for TOPIK ${topikLevel}`);

    // Gemini 2.5 Flash로 문제 생성
    const generatedQuestions = await generateListeningQuestions(count, topikLevel);
    console.log(`[Listening] Generated ${generatedQuestions.length} questions`);

    // 부족하면 폴백 추가
    let finalQuestions = generatedQuestions;
    if (finalQuestions.length < count) {
      const additional = FALLBACK_QUESTIONS.slice(0, count - finalQuestions.length);
      finalQuestions = [...finalQuestions, ...additional];
    }

    // 캐시에 저장 (4시간 유효 - 비용 절감)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'listening-content',
      response: finalQuestions.slice(0, count),
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({ 
      success: true, 
      questions: finalQuestions.slice(0, count),
      topikLevel,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Listening] Error:', error);
    
    return new Response(JSON.stringify({ 
      success: true, 
      questions: FALLBACK_QUESTIONS,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
