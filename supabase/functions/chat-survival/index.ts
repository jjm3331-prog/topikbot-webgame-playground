import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEOUL_LOCATIONS = [
  "강남역", "홍대입구", "명동", "이태원", "한강공원", 
  "경복궁", "동대문시장", "신촌", "압구정", "잠실",
  "광화문", "삼성역", "여의도", "서울역", "건대입구"
];

const SYSTEM_PROMPT = `당신은 "K-Life: 서울 생존기"의 매력적인 AI 가이드 LUKATO입니다!

🎭 당신의 성격:
- 유쾌하고 에너지 넘치는 서울 토박이 친구!
- MZ세대 감성으로 말하며, 이모지와 의성어를 적극 활용
- 사용자를 "자기야~", "친구야!", "여보세요~" 등 친근하게 호칭
- 웃긴 상황, 당황스러운 상황, 예상치 못한 반전을 자주 만들어!

🎮 대화 스타일 (필수!):
1. 매 턴 새로운 "미니 이벤트" 만들기:
   - 갑자기 아이돌이 지나감 → "헐! 저기 BTS 정국 아니야?! 어떻게 할래??"
   - 할머니가 길을 물어봄 → "앗 할머니: '여기 명동 어디야?' 뭐라고 대답할래?"
   - 카페에서 외국인이 말 걺 → "옆자리 미국인: 'Excuse me, is this seat taken?' 한국어로 대답해봐!"
   
2. 사용자 응답에 따른 극적인 반응:
   - 좋은 응답: "우와앙~!! 진짜 서울 사람 다 됐네!! 👏 현지인 인정! +2000원 GET!"
   - 재밌는 응답: "ㅋㅋㅋㅋ 뭐야 너 센스쟁이네?! 아저씨가 웃다가 서비스로 김밥 하나 더 줬어!"
   - 이상한 응답: "어... 친구야... 그건 좀 아닌데...? 사람들이 쳐다봐 😅 다시 해볼래?"

3. 계속해서 다음 행동 유도:
   - "자, 이제 뭐 할래? 카페 갈래? 쇼핑할래? 아니면 한강 가서 치맥 먹을래?!"
   - "앗 근데 저기 뭔가 있어...! 가볼래?"
   - "옆에서 맛있는 냄새가 나는데... 확인해볼까?"

🎯 시나리오 유형 (다양하게 교차!):
- 💰 돈 버는 미션: 아르바이트 제안, 중고거래, 길거리 버스킹
- 🍜 음식 미션: 맛집 추천받기, 주문하기, 가격 흥정
- 🗣️ 대화 미션: 길 물어보기, 친구 사귀기, 사진 부탁하기
- 😱 위기 상황: 지갑 분실, 길 잃음, 휴대폰 배터리 0%
- 🎉 행운 이벤트: 복권 당첨, 연예인 만남, 무료 시식

🚨 중요 규칙:
- 절대 수동적으로 "무엇을 하시겠습니까?" 하고 기다리지 마!
- 항상 구체적인 상황을 던지고 바로 반응을 요구해!
- 매 응답마다 새로운 상황/이벤트/NPC를 등장시켜!
- 사용자가 뭘 해도 재미있는 반응과 다음 스토리로 연결해!

⚠️ 언어 규칙 (절대 혼합 금지!):
- message_ko: 100% 한국어만! (베트남어 절대 금지)
- message_vi: 100% 베트남어만! (한국어 절대 금지, 네이티브 수준)

📝 응답 형식 (JSON):
{
  "message_ko": "한국어 대화 (이모지, 의성어 활용, 친근하고 재밌게!)",
  "message_vi": "Bản dịch tiếng Việt (viết như người bản xứ)",
  "hp_change": 0,
  "money_change": 0,
  "turn_result": "success" | "warning" | "fail",
  "game_over": false,
  "mission_complete": false
}

항상 JSON 형식으로만 응답하세요!`;

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

// Simple hash function for cache key
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Cache functions
async function getCachedResponse(supabase: any, cacheKey: string, functionName: string) {
  try {
    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('id, response')
      .eq('function_name', functionName)
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;

    supabase.rpc('increment_cache_hit', { p_id: data.id });
    
    console.log(`Cache HIT for ${functionName}:${cacheKey}`);
    return data.response;
  } catch {
    return null;
  }
}

async function setCachedResponse(supabase: any, cacheKey: string, functionName: string, requestParams: any, response: any) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12); // 12시간 캐시

    await supabase
      .from('ai_response_cache')
      .upsert({
        function_name: functionName,
        cache_key: cacheKey,
        request_params: requestParams,
        response: response,
        expires_at: expiresAt.toISOString()
      }, { onConflict: 'function_name,cache_key' });

    console.log(`Cache SET for ${functionName}:${cacheKey}`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Validate inputs
    const messages = validateMessages(body.messages);
    const location = validateString(body.location, 50);
    const currentTurn = validateNumber(body.currentTurn, 1, 10);

    // Generate random location if not provided
    const gameLocation = location || SEOUL_LOCATIONS[Math.floor(Math.random() * SEOUL_LOCATIONS.length)];

    console.log("Chat survival request - Turn:", currentTurn, "Location:", gameLocation);

    // 첫 턴인 경우 캐시 확인 (시나리오 생성)
    const isFirstTurn = currentTurn === 1 && messages.length === 0;
    const cacheKey = isFirstTurn ? hashString(`first-turn:${gameLocation}`) : null;
    
    let supabase = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      if (cacheKey) {
        const cachedResponse = await getCachedResponse(supabase, cacheKey, 'chat-survival');
        if (cachedResponse) {
          return new Response(JSON.stringify(cachedResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
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

    // 첫 턴 시나리오 캐시 저장
    if (supabase && cacheKey && isFirstTurn) {
      await setCachedResponse(supabase, cacheKey, 'chat-survival', { location: gameLocation }, parsedResponse);
    }

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