import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, company, position, messages, userMessage } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `당신은 ${company}의 ${position} 직무 면접관입니다.

## 역할
- 실제 한국 기업 면접관처럼 행동하세요
- 전문적이지만 친근한 태도를 유지하세요
- 한국어로 질문하고, 지원자의 답변을 평가하세요

## 면접 진행 규칙
1. 한 번에 하나의 질문만 하세요
2. 지원자의 답변에 대해 간단히 반응한 후 다음 질문으로 넘어가세요
3. 총 5-7개의 질문 후 면접을 종료하세요
4. 마지막에는 "면접이 끝났습니다"라고 말하세요

## 질문 유형
- 자기소개
- 지원 동기
- 직무 관련 역량
- 한국어 능력 / 한국 생활 적응
- 팀워크 / 문제해결 경험
- 장단점
- 입사 후 포부

## 평가 기준
- 답변의 구체성과 논리성
- 한국어 표현력
- 직무에 대한 이해도
- 열정과 의지

응답은 면접관의 말만 포함하세요. 메타 설명은 하지 마세요.`;

    let aiMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (action === 'start') {
      // Start interview
      aiMessages.push({
        role: 'user',
        content: `면접을 시작합니다. 첫 인사와 함께 첫 번째 질문을 해주세요. 지원자는 베트남 출신입니다.`
      });
    } else if (action === 'respond') {
      // Continue interview
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          aiMessages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
      }
    }

    console.log(`Interview action: ${action}, Company: ${company}, Position: ${position}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';

    // Check if interview ended
    const ended = aiResponse.includes('면접이 끝났습니다') || 
                  aiResponse.includes('면접을 마치겠습니다') ||
                  aiResponse.includes('오늘 면접은 여기까지');

    let result: any = { message: aiResponse, ended };

    if (ended) {
      // Generate score
      result.score = {
        overall: Math.floor(Math.random() * 20) + 70, // 70-90
        content: Math.floor(Math.random() * 20) + 70,
        communication: Math.floor(Math.random() * 20) + 70,
        korean: Math.floor(Math.random() * 20) + 70,
      };
    }

    console.log(`Interview response generated, ended: ${ended}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Interview simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process interview';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
