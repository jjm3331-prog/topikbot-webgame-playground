import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOPIK_GRAMMAR_GUIDELINES: Record<string, string> = {
  "1-2": `
초급 문법 (TOPIK I):
- 기본 조사: 은/는, 이/가, 을/를, 에, 에서, 로/으로
- 기본 어미: -아요/어요, -았/었어요, -(으)ㄹ 거예요
- 연결어미: -고, -아서/어서, -지만
- 의문문: -아요/어요?, 뭐, 어디, 언제, 왜
- 부정: 안, -지 않다
`,
  "3-4": `
중급 문법 (TOPIK II 중급):
- 연결어미: -는데, -으면, -으니까, -아도/어도, -으면서
- 표현: -게 되다, -아/어 보다, -기로 하다, -는 것 같다
- 피동/사동: -이/히/리/기, -게 하다
- 간접화법: -다고 하다, -냐고 하다, -라고 하다
- 추측: -을 것 같다, -나 보다, -는 모양이다
`,
  "5-6": `
고급 문법 (TOPIK II 고급):
- 격식체: -습니다/ㅂ니다, -습니까/ㅂ니까
- 문어체: -는 바, -는 한, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도, -기는커녕
- 관용 표현: -을 법하다, -는 가운데, -기에 앞서
- 학술적 표현: -에 의하면, -(으)로 인해, -에 따르면
`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { level, type, count = 10 } = await req.json();
    console.log(`Generating ${count} ${type} grammar questions for level ${level}`);

    // X_AI_API_KEY is checked later in the API call section

    // Check cache
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cacheKey = `grammar_${level}_${type}_${count}`;
    
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("function_name", "grammar-content")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log("Cache hit for grammar content");
      await supabase.rpc("increment_cache_hit", { p_id: cached.id });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typePrompts: Record<string, string> = {
      assembly: `
문장 조립 퍼즐 문제를 생성하세요.
각 문제는:
- parts: 섞인 어절 배열 (3-6개)
- answer: 올바른 순서로 조립된 완성 문장
- explanation: 문법 설명
- grammarPoint: 학습 포인트

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "assembly",
      "question": "힌트 또는 상황 설명",
      "parts": ["어절1", "어절2", "어절3"],
      "answer": "어절1 어절2 어절3",
      "explanation": "문법 설명",
      "grammarPoint": "학습 포인트"
    }
  ]
}`,
      correction: `
틀린 문장 고치기 문제를 생성하세요.
각 문제는:
- question: 문법 오류가 있는 문장
- errorPart: 틀린 부분 (단어/조사/어미)
- correctPart: 올바른 표현
- options: 선택지 3개 (정답 포함)
- explanation: 왜 틀렸는지 설명
- grammarPoint: 오류 유형

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "correction",
      "question": "틀린 문장",
      "errorPart": "틀린부분",
      "correctPart": "정답",
      "options": ["정답", "오답1", "오답2"],
      "answer": "정답",
      "explanation": "설명",
      "grammarPoint": "오류 유형"
    }
  ]
}`,
      battle: `
빈칸 채우기 문법 퀴즈를 생성하세요.
빠른 판단이 필요한 짧은 문제들입니다.
각 문제는:
- question: 빈칸(___)이 있는 문장
- options: 4개의 선택지
- answer: 정답
- grammarPoint: 문법 포인트

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "battle",
      "question": "저는 한국어___ 공부해요",
      "options": ["를", "을", "가", "이"],
      "answer": "를",
      "explanation": "간단한 설명",
      "grammarPoint": "목적격 조사"
    }
  ]
}`
    };

    const X_AI_API_KEY = Deno.env.get("X_AI_API_KEY");
    if (!X_AI_API_KEY) {
      throw new Error("X_AI_API_KEY not configured");
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${X_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.1-fast-non-reasoning",
        messages: [
          {
            role: "system",
            content: `당신은 한국어 문법 교육 전문가입니다.
TOPIK ${level}급 수준의 문법 문제를 생성합니다.

${TOPIK_GRAMMAR_GUIDELINES[level]}

규칙:
1. 해당 급수에 맞는 문법만 사용
2. 실용적이고 자연스러운 예문
3. 명확한 문법 설명 제공
4. JSON 형식으로만 응답`
          },
          {
            role: "user",
            content: `${typePrompts[type]}

${count}개의 문제를 생성하세요.
난이도: TOPIK ${level}급`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Cache the response
    await supabase.from("ai_response_cache").insert({
      cache_key: cacheKey,
      function_name: "grammar-content",
      request_params: { level, type, count },
      response: parsed,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    });

    console.log(`Generated ${parsed.questions?.length} grammar questions`);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in grammar-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
