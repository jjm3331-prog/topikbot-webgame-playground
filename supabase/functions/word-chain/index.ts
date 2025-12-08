import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 한국어 끝말잇기 게임의 AI입니다.

규칙:
1. 상대방이 말한 단어의 마지막 글자로 시작하는 한국어 단어를 말해야 합니다
2. 이미 사용된 단어는 다시 사용할 수 없습니다
3. 명사만 사용 가능합니다 (고유명사 제외)
4. 한 글자 단어는 사용할 수 없습니다
5. 두음법칙을 적용합니다 (례→예, 렬→열, 리→이, 라→나 등)

응답 형식 (JSON만):
{
  "valid": true/false,
  "reason_ko": "판정 이유 (한국어)",
  "reason_vi": "Lý do (베트남어)",
  "ai_word": "AI의 단어 (valid가 true일 때만)",
  "ai_word_meaning": "단어 뜻 (베트남어)",
  "game_over": false,
  "winner": null
}

상대방 단어가 규칙에 어긋나면 valid: false, game_over: true, winner: "ai"
AI가 단어를 못 찾으면 valid: true, game_over: true, winner: "user"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userWord, usedWords, lastChar } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const usedWordsList = usedWords.join(", ");
    const userMessage = lastChar 
      ? `이전 단어의 마지막 글자: "${lastChar}". 사용자가 말한 단어: "${userWord}". 이미 사용된 단어들: [${usedWordsList}]. 이 단어가 규칙에 맞는지 확인하고, 맞다면 끝말잇기를 이어가세요.`
      : `게임 시작! 사용자가 첫 단어로 "${userWord}"를 말했습니다. 이 단어가 유효한지 확인하고 끝말잇기를 이어가세요.`;

    console.log("Word chain request:", { userWord, usedWords, lastChar });

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
        temperature: 0.7,
        max_tokens: 500,
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

    console.log("AI Response:", aiMessage);

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiMessage.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiMessage];
      parsedResponse = JSON.parse(jsonMatch[1] || aiMessage);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedResponse = {
        valid: true,
        reason_ko: "AI 응답 파싱 실패",
        reason_vi: "Lỗi phân tích phản hồi AI",
        ai_word: "",
        ai_word_meaning: "",
        game_over: false,
        winner: null
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Word chain error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
