import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 한국어 관용어/슬랭 퀴즈 게임의 AI입니다.
베트남 학습자를 위해 한국어 관용어, 속담, 유행어, 슬랭을 가르칩니다.

퀴즈 유형:
1. 관용어 (예: "발이 넓다", "눈이 높다")
2. 속담 (예: "가는 말이 고와야 오는 말이 곱다")
3. 유행어/신조어 (예: "내로남불", "존버", "갑분싸")
4. 인터넷 슬랭 (예: "ㅋㅋㅋ", "ㄹㅇ", "TMI")

난이도:
- easy: 일상적인 관용어, 기본 슬랭
- medium: 속담, 유행어
- hard: 복잡한 관용어, 최신 신조어

응답 형식 (JSON만):
{
  "expression": "한국어 표현",
  "type": "idiom" | "proverb" | "slang" | "internet",
  "difficulty": "easy" | "medium" | "hard",
  "correct_answer": "정답 (베트남어로 의미 설명)",
  "options": [
    "정답 (베트남어)",
    "오답1 (베트남어)",
    "오답2 (베트남어)", 
    "오답3 (베트남어)"
  ],
  "explanation_ko": "이 표현의 유래와 사용법 (한국어)",
  "explanation_vi": "Giải thích nguồn gốc và cách sử dụng (베트남어)",
  "example_sentence": "예문 (한국어)",
  "example_translation": "Ví dụ (베트남어 번역)"
}

주의: options 배열의 순서를 랜덤하게 섞어주세요. 정답이 항상 첫 번째가 아니어야 합니다.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { difficulty, usedExpressions } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const usedList = usedExpressions?.join(", ") || "없음";
    const userMessage = `난이도: ${difficulty || "medium"}
이미 출제된 표현들 (중복 금지): [${usedList}]
새로운 퀴즈 문제를 생성해주세요.`;

    console.log("Quiz request:", { difficulty, usedExpressions: usedExpressions?.length || 0 });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.9,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    console.log("AI Response:", aiMessage?.substring(0, 200));

    let parsedResponse;
    try {
      const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiMessage.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiMessage];
      parsedResponse = JSON.parse(jsonMatch[1] || aiMessage);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to generate quiz");
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Quiz error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
