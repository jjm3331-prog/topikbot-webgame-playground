import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TopikLevel = "1-2" | "3-4" | "5-6";
type GrammarType = "assembly" | "battle" | "correction";

const TOPIK_GRAMMAR_GUIDELINES: Record<TopikLevel, string> = {
  "1-2": `초급 문법 (TOPIK I):
- 기본 조사: 은/는, 이/가, 을/를, 에, 에서, 로/으로
- 기본 어미: -아요/어요, -았/었어요, -(으)ㄹ 거예요
- 연결어미: -고, -아서/어서, -지만`,
  "3-4": `중급 문법 (TOPIK II 중급):
- 연결어미: -는데, -으면, -으니까, -아도/어도
- 표현: -게 되다, -아/어 보다, -기로 하다
- 추측: -을 것 같다, -나 보다`,
  "5-6": `고급 문법 (TOPIK II 고급):
- 문어체: -는 바, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도
- 학술적 표현: -에 의하면, -(으)로 인해`,
};

const typePrompts: Record<GrammarType, string> = {
  assembly: `문장 조립 퍼즐 문제를 생성하세요.
JSON 스키마:
{
  "id": "1",
  "type": "assembly",
  "question_ko": "힌트 (한국어)",
  "question_vi": "Gợi ý (tiếng Việt)",
  "parts": ["어절1", "어절2", "어절3"],
  "answer": "어절1 어절2 어절3",
  "explanation_ko": "문법 설명 (한국어)",
  "explanation_vi": "Giải thích (tiếng Việt tự nhiên)",
  "grammarPoint_ko": "문법 포인트 (한국어)",
  "grammarPoint_vi": "Điểm ngữ pháp (tiếng Việt)"
}`,
  correction: `문법 오류 수정 문제를 생성하세요.
JSON 스키마:
{
  "id": "1",
  "type": "correction",
  "sentence_ko": "틀린 문장 (한국어)",
  "sentence_vi": "Câu sai (tiếng Việt)",
  "errorPart": "틀린부분",
  "correctPart": "정답",
  "options": ["정답", "오답1", "오답2", "오답3"],
  "answer": "정답",
  "explanation_ko": "설명 (한국어)",
  "explanation_vi": "Giải thích (tiếng Việt)",
  "grammarPoint_ko": "오류 유형 (한국어)",
  "grammarPoint_vi": "Loại lỗi (tiếng Việt)"
}`,
  battle: `빈칸 채우기 문법 퀴즈를 생성하세요.
JSON 스키마:
{
  "id": "1",
  "type": "battle",
  "question_ko": "저는 한국어___ 공부해요",
  "question_vi": "Tôi học tiếng Hàn ___",
  "options": ["를", "을", "가", "이"],
  "answer": "를",
  "explanation_ko": "간단한 설명 (한국어)",
  "explanation_vi": "Giải thích ngắn (tiếng Việt)",
  "grammarPoint_ko": "목적격 조사",
  "grammarPoint_vi": "Trợ từ tân ngữ"
}`,
};

function safeExtractJsonObject(raw: string): string | null {
  const match = raw.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, type, count = 10 } = (await req.json().catch(() => ({}))) as {
      level: TopikLevel;
      type: GrammarType;
      count?: number;
    };

    const safeLevel: TopikLevel = level === "3-4" || level === "5-6" ? level : "1-2";
    const safeType: GrammarType = type === "correction" || type === "battle" ? type : "assembly";
    const safeCount = Math.max(1, Math.min(30, Number.isFinite(count) ? (count as number) : 10));

    console.log("[Grammar] request", { level: safeLevel, type: safeType, count: safeCount });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 캐시 확인
    const cacheKey = `grammar_${safeLevel}_${safeType}_${safeCount}`;
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("function_name", "grammar-content")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log("[Grammar] Cache hit");
      await supabase.rpc("increment_cache_hit", { p_id: cached.id });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lovable AI (Gemini 2.5 Flash)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `당신은 한국어(TOPIK) 문법 교육 전문가입니다.
사용자: 베트남인 학습자.

규칙:
- 출력은 오직 JSON 하나만 (마크다운 금지)
- 베트남어는 번역투 금지, 자연스러운 네이티브 표현
- 난이도는 TOPIK ${safeLevel}급에 엄격히 맞출 것

${TOPIK_GRAMMAR_GUIDELINES[safeLevel]}`;

    const userPrompt = `${typePrompts[safeType]}

생성 개수: ${safeCount}
반드시 {"questions": [...]} 형태의 JSON 객체로 반환하세요.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: safeLevel === "5-6" ? 0.6 : 0.8,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("[Grammar] Lovable AI error:", resp.status, t);
      throw new Error(`AI API error: ${resp.status}`);
    }

    const aiData = await resp.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = safeExtractJsonObject(content);
    if (!jsonStr) throw new Error("Failed to parse AI response as JSON object");

    const parsed = JSON.parse(jsonStr);

    // 캐시 저장
    await supabase.from("ai_response_cache").insert({
      cache_key: cacheKey,
      function_name: "grammar-content",
      request_params: { level: safeLevel, type: safeType, count: safeCount },
      response: parsed,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Grammar] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
