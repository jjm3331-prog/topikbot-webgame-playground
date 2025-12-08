import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, npcName, npcMbti, npcJob, currentAffinity, conversationHistory } = await req.json();

    console.log('Dating chat request:', { message, npcName, npcMbti, currentAffinity });

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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    console.log('OpenAI response:', data);

    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback response
      parsedResponse = {
        response: content,
        affinityChange: 5,
        reason: "대화가 진행되었어요 / Cuộc trò chuyện đã tiếp tục"
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dating chat error:', errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      response: "죄송해요, 잠시 문제가 생겼어요... 다시 말해줄래요? 😅",
      affinityChange: 0,
      reason: "시스템 오류 / Lỗi hệ thống"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
