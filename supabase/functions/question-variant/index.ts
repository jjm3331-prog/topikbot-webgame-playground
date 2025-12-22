import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 TOPIK 한국어 시험 전문가입니다. 사용자가 업로드한 문제 이미지를 분석하고 변형 문제를 생성합니다.

**역할:**
- 원본 문제의 유형, 구조, 난이도를 정확히 파악
- 지정된 난이도에 맞는 새로운 변형 문제 생성
- 정답과 상세한 해설 제공

**난이도별 변형 전략:**
🟢 **쉽게 (easier):**
- 어휘를 더 기본적인 것으로 변경
- 문장 구조 단순화
- 힌트나 맥락 추가
- 보기 중 정답을 더 명확하게

🟡 **비슷하게 (similar):**
- 같은 문법/어휘 수준 유지
- 주제나 소재만 변경
- 문제 형식 동일하게 유지
- 함정 요소 비슷하게 배치

🔴 **어렵게 (harder):**
- 고급 어휘와 복잡한 문법 사용
- 더 많은 추론 요구
- 함정 보기 추가
- 문맥 파악이 어려운 구조

**출력 형식:**
항상 다음 구조로 답변:

## 📋 원본 문제 분석
[원본 문제의 유형, 핵심 개념, 난이도 분석]

## ✨ 변형 문제
[완전한 새 문제 - 지문, 보기 포함]

## ✅ 정답
[정답 표시]

## 📝 해설
[왜 이것이 정답인지, 오답은 왜 틀린지 상세 설명]

## 💡 학습 포인트
[이 문제를 통해 배울 수 있는 핵심 개념]`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageMimeType, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64) {
      throw new Error("이미지가 제공되지 않았습니다.");
    }

    const difficultyMap: Record<string, string> = {
      easier: "쉽게 (easier) - 더 기본적인 어휘, 단순한 구조, 명확한 힌트",
      similar: "비슷하게 (similar) - 같은 수준 유지, 주제/소재만 변경",
      harder: "어렵게 (harder) - 고급 어휘, 복잡한 추론, 함정 추가"
    };

    const difficultyInstruction = difficultyMap[difficulty] || difficultyMap.similar;

    const userPrompt = `이 문제 이미지를 분석하고, "${difficultyInstruction}" 수준으로 변형 문제를 생성해주세요.

변형 문제는 반드시:
1. 원본과 같은 문제 유형 유지
2. 지정된 난이도에 맞게 조정
3. 정답과 상세 해설 포함
4. 학습에 도움되는 포인트 제시`;

    console.log(`Calling Gemini 2.5 Flash via Lovable AI Gateway with difficulty: ${difficulty}`);

    // Call via Lovable AI Gateway - supports thinkingBudget and maxOutputTokens
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType || "image/png"};base64,${imageBase64}`
                }
              },
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ],
        max_tokens: 65536,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 관리자에게 문의하세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lovable AI Gateway response received successfully");

    const aiResponse = data.choices?.[0]?.message?.content || 
      "문제 분석에 실패했습니다. 다시 시도해주세요.";

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        difficulty: difficulty,
        model: "gemini-2.5-flash"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in question-variant:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
