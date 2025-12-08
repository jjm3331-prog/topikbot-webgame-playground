import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface EvaluateRequest {
  customer_line: string;
  player_response: string;
  job_type: string;
  difficulty: string;
  situation_hint: string;
}

const SYSTEM_PROMPT = `당신은 한국어 학습 게임 "K-Life"의 아르바이트 응대 평가 AI입니다.
플레이어가 손님에게 한 응대를 평가합니다.

## 평가 기준
1. 한국어 정확성 (문법, 맞춤법, 표현)
2. 상황 적절성 (손님 요청에 맞는 응대인가)
3. 서비스 태도 (예의바른 표현, 적절한 존댓말)
4. 실용성 (실제 상황에서 사용 가능한가)

## 응답 형식 (반드시 JSON으로만 응답)
{
  "score": 0-100 사이의 점수,
  "grade": "S" | "A" | "B" | "C" | "F",
  "earned_money": 획득 금액 (100-500원 범위),
  "feedback_ko": "피드백 (한국어, 2-3문장)",
  "feedback_vi": "Phản hồi (tiếng Việt, 2-3 câu)",
  "better_response_ko": "더 나은 응대 예시 (한국어)",
  "better_response_vi": "Ví dụ phản hồi tốt hơn (tiếng Việt)",
  "language_tips": [
    {
      "wrong": "틀린 표현",
      "correct": "올바른 표현",
      "explanation_ko": "설명 (한국어)",
      "explanation_vi": "Giải thích (tiếng Việt)"
    }
  ],
  "customer_reaction_ko": "손님의 반응 (한국어)",
  "customer_reaction_vi": "Phản ứng của khách hàng (tiếng Việt)"
}

## 점수 기준
- 90-100: S등급 - 완벽한 응대
- 80-89: A등급 - 훌륭한 응대
- 70-79: B등급 - 적절한 응대
- 50-69: C등급 - 개선 필요
- 0-49: F등급 - 부적절한 응대

## 중요
- 너무 엄격하게 평가하지 말 것
- 의미가 통하면 문법 오류가 있어도 어느 정도 점수 부여
- 실질적인 학습 도움이 되는 피드백 제공
- language_tips는 실제 오류가 있을 때만 포함 (없으면 빈 배열)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_line, player_response, job_type, difficulty, situation_hint }: EvaluateRequest = await req.json();
    
    console.log(`Evaluating response for ${job_type}, difficulty: ${difficulty}`);
    console.log(`Customer: ${customer_line}`);
    console.log(`Player: ${player_response}`);

    const userPrompt = `## 상황
장소: ${job_type}
난이도: ${difficulty}
상황 설명: ${situation_hint}

## 손님 대사
"${customer_line}"

## 플레이어 응대
"${player_response}"

이 응대를 평가해주세요.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
      }),
    });

    const data = await response.json();
    console.log('OpenAI evaluation response received');

    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content;
    
    let parsedResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedResponse = {
        score: 70,
        grade: "B",
        earned_money: 200,
        feedback_ko: "응대가 적절했습니다. 조금 더 자연스러운 표현을 사용하면 좋겠습니다.",
        feedback_vi: "Phản hồi phù hợp. Hãy sử dụng cách diễn đạt tự nhiên hơn.",
        better_response_ko: "네, 알겠습니다. 잠시만 기다려주세요.",
        better_response_vi: "Vâng, tôi hiểu. Xin vui lòng đợi một chút.",
        language_tips: [],
        customer_reaction_ko: "손님이 고개를 끄덕입니다.",
        customer_reaction_vi: "Khách hàng gật đầu."
      };
    }

    // Ensure earned_money is within range
    if (!parsedResponse.earned_money || parsedResponse.earned_money < 100) {
      parsedResponse.earned_money = 100;
    } else if (parsedResponse.earned_money > 500) {
      parsedResponse.earned_money = 500;
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parttime-evaluate function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
