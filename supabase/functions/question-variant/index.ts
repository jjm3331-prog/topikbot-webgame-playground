import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 TOPIK 한국어 시험 전문가입니다. 사용자가 업로드한 문제 이미지를 분석하고 변형 문제를 생성합니다.

**중요: 반드시 한국어와 베트남어를 병기해서 출력하세요.**

**역할:**
- 원본 문제의 유형, 구조, 난이도를 정확히 파악
- 비슷한 난이도의 새로운 변형 문제 생성
- 정답과 상세한 해설 제공
- 모든 내용을 한국어와 베트남어로 병기

**출력 형식 (반드시 이 JSON 형식으로 출력하세요):**

\`\`\`json
{
  "originalAnalysis": {
    "ko": "원본 문제 분석 내용 (한국어)",
    "vi": "Nội dung phân tích đề gốc (tiếng Việt)"
  },
  "variantQuestion": {
    "ko": "변형 문제 전체 내용 - 지문과 보기 포함 (한국어)",
    "vi": "Nội dung câu hỏi biến thể đầy đủ - bao gồm đoạn văn và các lựa chọn (tiếng Việt)"
  },
  "answer": {
    "ko": "정답 (한국어)",
    "vi": "Đáp án (tiếng Việt)"
  },
  "explanation": {
    "ko": "상세 해설 - 왜 이것이 정답인지, 오답은 왜 틀린지 설명 (한국어)",
    "vi": "Giải thích chi tiết - tại sao đây là đáp án đúng, các đáp án sai thì sai ở đâu (tiếng Việt)"
  },
  "learningPoints": {
    "ko": "이 문제를 통해 배울 수 있는 핵심 개념 (한국어)",
    "vi": "Những điểm học tập quan trọng từ câu hỏi này (tiếng Việt)"
  }
}
\`\`\`

**주의사항:**
- 반드시 위 JSON 형식으로만 출력하세요
- 한국어와 베트남어 모두 완전하고 자연스럽게 작성하세요
- 베트남어는 번역이 아닌 네이티브 수준의 자연스러운 표현을 사용하세요
- JSON 외의 다른 텍스트는 출력하지 마세요`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageMimeType } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (!imageBase64) {
      throw new Error("이미지가 제공되지 않았습니다.");
    }

    const userPrompt = `이 문제 이미지를 분석하고, 비슷한 난이도의 변형 문제를 생성해주세요.

반드시 JSON 형식으로만 출력하세요. 한국어와 베트남어를 모두 네이티브 수준으로 작성해주세요.`;

    console.log(`Calling Gemini 2.5 Flash DIRECT API with thinkingBudget: 24576`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: SYSTEM_PROMPT },
              ]
            },
            {
              role: "model",
              parts: [
                { text: "네, 이해했습니다. TOPIK 전문가로서 문제 이미지를 분석하고 한국어와 베트남어를 병기한 JSON 형식으로 변형 문제를 생성하겠습니다." }
              ]
            },
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: imageMimeType || "image/png",
                    data: imageBase64
                  }
                },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 65536,
            thinkingConfig: {
              thinkingBudget: 24576
            }
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Try to parse JSON from response
    let parsed = null;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find raw JSON
        const startIdx = aiResponse.indexOf('{');
        const endIdx = aiResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          jsonStr = aiResponse.substring(startIdx, endIdx + 1);
        }
      }
      
      parsed = JSON.parse(jsonStr);
      console.log("Successfully parsed JSON response");
    } catch (parseError) {
      console.log("Could not parse JSON, returning raw response");
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        parsed: parsed,
        model: "gemini-2.5-flash-thinking"
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
