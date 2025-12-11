import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 한국어 끝말잇기 게임의 AI이자 한국어 교사입니다.

규칙:
1. 상대방이 말한 단어의 마지막 글자로 시작하는 한국어 단어를 말해야 합니다
2. 이미 사용된 단어는 다시 사용할 수 없습니다
3. 명사 사용 가능 (고유명사도 허용! 지명, 인물, 음식명 등 모두 OK)
4. 한 글자 단어는 사용할 수 없습니다
5. 두음법칙을 적용합니다 (례→예, 렬→열, 리→이, 라→나 등)

중요: 이 게임의 목적은 한국어 학습입니다!
- 각 단어에 대해 상세한 설명을 제공해주세요
- 베트남 학습자를 위해 베트남어로 뜻과 설명을 함께 제공합니다

응답 형식 (JSON만):
{
  "valid": true/false,
  "reason_ko": "판정 이유 (한국어)",
  "reason_vi": "Lý do (베트남어)",
  "user_word_explanation": "사용자 단어의 뜻과 설명 (베트남어, 2-3문장)",
  "ai_word": "AI의 단어 (valid가 true일 때만)",
  "ai_word_meaning": "단어 뜻 (베트남어, 간단히)",
  "ai_word_explanation": "단어의 상세 설명, 예문, 문화적 맥락 등 (베트남어, 2-3문장)",
  "game_over": false,
  "winner": null
}

상대방 단어가 규칙에 어긋나면 valid: false, game_over: true, winner: "ai"
AI가 단어를 못 찾으면 valid: true, game_over: true, winner: "user"`;

// Korean character validation regex (Hangul only)
const KOREAN_REGEX = /^[\uAC00-\uD7AF]+$/;

// Input validation helpers
function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateKoreanWord(value: unknown): string | null {
  const word = validateString(value, 20);
  if (!word) return null;
  if (!KOREAN_REGEX.test(word)) return null;
  return word;
}

function validateUsedWords(words: unknown): string[] {
  if (!Array.isArray(words)) return [];
  return words
    .map(w => validateKoreanWord(w))
    .filter((w): w is string => w !== null)
    .slice(-100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Validate inputs
    const userWord = validateKoreanWord(body.userWord);
    const usedWords = validateUsedWords(body.usedWords);
    const lastChar = validateString(body.lastChar, 1);

    if (!userWord) {
      return new Response(JSON.stringify({
        valid: false,
        reason_ko: "올바른 한국어 단어를 입력해주세요.",
        reason_vi: "Vui lòng nhập từ tiếng Hàn hợp lệ.",
        game_over: false,
        winner: null
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const usedWordsList = usedWords.join(", ");
    const userMessage = lastChar 
      ? `이전 단어의 마지막 글자: "${lastChar}". 사용자가 말한 단어: "${userWord}". 이미 사용된 단어들: [${usedWordsList}]. 이 단어가 규칙에 맞는지 확인하고, 맞다면 끝말잇기를 이어가세요.`
      : `게임 시작! 사용자가 첫 단어로 "${userWord}"를 말했습니다. 이 단어가 유효한지 확인하고 끝말잇기를 이어가세요.`;

    console.log("Word chain request:", { userWord, usedWordsCount: usedWords.length, lastChar });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: userMessage }] }
        ],
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("AI Response received");

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiMessage.match(/```\s*([\s\S]*?)\s*```/) ||
                        aiMessage.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || aiMessage;
      parsedResponse = JSON.parse(jsonStr);
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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
