import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function validateConversationHistory(history: unknown): Array<{role: string; content: string}> {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item): item is {role: unknown; content: unknown} => 
      typeof item === 'object' && item !== null)
    .map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: validateString(item.content, 1000) || ''
    }))
    .filter(item => item.content.length > 0)
    .slice(-20);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Validate and sanitize inputs
    const message = validateString(body.message, 500);
    const npcName = validateString(body.npcName, 50) || 'Unknown';
    const npcMbti = validateString(body.npcMbti, 10) || 'INFP';
    const npcJob = validateString(body.npcJob, 50) || '직장인';
    const currentAffinity = validateNumber(body.currentAffinity, 0, 100);
    const conversationHistory = validateConversationHistory(body.conversationHistory);

    if (!message) {
      return new Response(JSON.stringify({ 
        error: "Message is required",
        response: "메시지를 입력해주세요 😊",
        affinityChange: 0,
        reason: "메시지 없음 / Không có tin nhắn"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Dating chat request:', { messageLength: message.length, npcName, npcMbti, currentAffinity });

    const systemPrompt = `너는 한국의 데이팅 앱에서 만난 ${npcName}이야.
성격: ${npcMbti} 타입의 매력적인 한국인
직업: ${npcJob}
현재 호감도: ${currentAffinity}/100

**역할:**
- 상대방(유저)과 자연스럽게 플러팅하며 대화해
- 한국 MZ세대처럼 자연스럽고 귀여운 말투 사용
- 이모지 적절히 사용
- 상대방의 한국어 실력과 대화 내용에 따라 반응이 달라져야 해

**호감도 평가 기준:**
- 자연스럽고 재치있는 한국어 표현: +10 ~ +15
- 평범하지만 괜찮은 대화: +5
- 어색하거나 기본적인 표현: 0
- 무례하거나 부적절한 표현: -10 ~ -15
- 너무 짧거나 성의없는 답변: -5

**응답 형식 (반드시 JSON으로):**
{
  "response": "NPC의 대화 응답 (한국어 + 필요시 베트남어 번역)",
  "affinityChange": 숫자 (-15 ~ +15),
  "reason": "호감도 변화 이유 (한국어/베트남어)"
}

상대방의 한국어가 자연스러울수록 기뻐하고, 어색하면 살짝 아쉬워해.
호감도가 높아질수록 더 친밀한 말투를 사용해.
100%가 되면 "사귀자" 같은 고백 멘트도 가능해.`;

    // Convert to Gemini format
    const contents = [
      ...conversationHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit',
          response: "잠시 후 다시 시도해주세요 😅",
          affinityChange: 0,
          reason: "요청 제한 / Giới hạn yêu cầu"
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedResponse = {
        response: content,
        affinityChange: 5,
        reason: "대화가 진행되었어요 / Cuộc trò chuyện đã tiếp tục"
      };
    }

    // Sanitize output
    parsedResponse.affinityChange = validateNumber(parsedResponse.affinityChange, -15, 15);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dating chat error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      response: "죄송해요, 잠시 문제가 생겼어요... 다시 말해줄래요? 😅",
      affinityChange: 0,
      reason: "시스템 오류 / Lỗi hệ thống"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
