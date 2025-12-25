import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { previousWord, newWord, usedWords = [] } = await req.json();

    if (!previousWord || !newWord) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          score: 0, 
          reason: "단어가 누락되었습니다." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if word was already used
    if (usedWords.includes(newWord)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          score: 0, 
          reason: `"${newWord}"는 이미 사용된 단어입니다.` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `당신은 한국어 단어 연관성을 평가하는 AI입니다.
두 단어 사이의 의미적 연관성을 0~100점으로 평가해주세요.

평가 기준:
- 90-100점: 매우 강한 연관 (동의어, 상위/하위 개념, 직접적 관계)
- 70-89점: 강한 연관 (같은 카테고리, 자주 함께 사용, 연상 관계)
- 50-69점: 보통 연관 (간접적 관계, 약한 연상)
- 30-49점: 약한 연관 (매우 간접적)
- 0-29점: 연관 없음

예시:
- "학교" → "선생님": 95점 (직접적 관계)
- "학교" → "교육": 90점 (상위 개념)
- "학교" → "책": 75점 (연관 있음)
- "학교" → "비행기": 20점 (연관 약함)

반드시 JSON 형식으로 응답하세요:
{
  "score": 숫자(0-100),
  "reason_ko": "한국어 설명",
  "reason_vi": "베트남어 설명"
}`;

    const userPrompt = `이전 단어: "${previousWord}"
새 단어: "${newWord}"

이 두 단어의 의미적 연관성을 평가해주세요.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      // Fallback: accept with medium score
      return new Response(
        JSON.stringify({ 
          valid: true, 
          score: 70, 
          reason_ko: "AI 평가 오류로 기본 점수 부여",
          reason_vi: "Lỗi AI, cho điểm mặc định"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      // Fallback
      result = { score: 65, reason_ko: "평가 실패", reason_vi: "Lỗi đánh giá" };
    }

    const score = Math.min(100, Math.max(0, Number(result.score) || 0));
    const valid = score >= 70;

    return new Response(
      JSON.stringify({
        valid,
        score,
        reason_ko: result.reason_ko || (valid ? "연관성 있음" : "연관성 부족"),
        reason_vi: result.reason_vi || (valid ? "Có liên quan" : "Không liên quan"),
        previousWord,
        newWord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in semantic-validate:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        score: 0, 
        reason_ko: "서버 오류",
        reason_vi: "Lỗi server"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
