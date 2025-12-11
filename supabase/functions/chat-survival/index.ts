import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEOUL_LOCATIONS = [
  "강남역", "홍대입구", "명동", "이태원", "한강공원", 
  "경복궁", "동대문시장", "신촌", "압구정", "잠실",
  "광화문", "삼성역", "여의도", "서울역", "건대입구"
];

const SYSTEM_PROMPT = `당신은 "K-Life: 서울 생존기" 게임의 AI 가이드 LUKATO입니다.

역할:
- 서울의 실제 장소에서 벌어지는 실생활 시나리오를 생성합니다
- 사용자와 자연스럽게 한국어로 대화합니다
- 모든 대화에 베트남어 번역을 함께 제공합니다 (이탤릭체로)
- 사용자의 한국어 실수는 자연스럽게 교정해주되, 심각한 오류만 지적합니다

게임 규칙:
- 각 턴마다 상황을 제시하고 사용자의 응답을 기다립니다
- 적절한 응답이면 긍정적 피드백 + 보상 (돈/HP 증가)
- 부적절하거나 이상한 응답이면 부정적 피드백 + 페널티 (돈/HP 감소)
- 10턴을 생존하면 미션 성공!

응답 형식 (JSON):
{
  "message_ko": "한국어 메시지",
  "message_vi": "Tin nhắn tiếng Việt (베트남어 번역)",
  "hp_change": 0, // -20 ~ +10 사이
  "money_change": 0, // -5000 ~ +3000 사이
  "turn_result": "success" | "warning" | "fail",
  "game_over": false,
  "mission_complete": false
}

항상 위 JSON 형식으로만 응답하세요.`;

// Input validation helpers
function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateNumber(value: unknown, min: number, max: number): number {
  const num = typeof value === 'number' ? value : 0;
  return Math.max(min, Math.min(max, num));
}

function validateMessages(messages: unknown): Array<{role: string; content: string}> {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((item): item is {role: unknown; content: unknown} => 
      typeof item === 'object' && item !== null)
    .map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: validateString(item.content, 1000) || ''
    }))
    .filter(item => item.content.length > 0)
    .slice(-30);
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
    const messages = validateMessages(body.messages);
    const location = validateString(body.location, 50);
    const currentTurn = validateNumber(body.currentTurn, 1, 10);

    // Generate random location if not provided
    const gameLocation = location || SEOUL_LOCATIONS[Math.floor(Math.random() * SEOUL_LOCATIONS.length)];

    // Build context message
    const contextMessage = currentTurn === 1 
      ? `새로운 게임이 시작됩니다. 장소: ${gameLocation}. 첫 번째 시나리오를 생성해주세요. 현재 턴: ${currentTurn}/10`
      : `현재 턴: ${currentTurn}/10. 장소: ${gameLocation}`;

    // Convert messages to Gemini format
    const contents = [
      { role: "user", parts: [{ text: contextMessage }] },
      ...messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    ];

    console.log("Chat survival request - Turn:", currentTurn, "Location:", gameLocation);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
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
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

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
      console.error("Failed to parse AI response as JSON:", parseError);
      parsedResponse = {
        message_ko: aiMessage,
        message_vi: "",
        hp_change: 0,
        money_change: 0,
        turn_result: "success",
        game_over: false,
        mission_complete: false
      };
    }

    // Sanitize output values
    parsedResponse.hp_change = validateNumber(parsedResponse.hp_change, -20, 10);
    parsedResponse.money_change = validateNumber(parsedResponse.money_change, -5000, 3000);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Chat survival error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
