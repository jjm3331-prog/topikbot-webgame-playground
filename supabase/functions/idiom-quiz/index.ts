import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `당신은 한국어 관용어/슬랭 퀴즈 출제자입니다.
베트남 학습자를 위한 한국어 학습 게임입니다.

## 퀴즈 유형 (다양하게 출제)
1. 전통 관용어/속담 (예: 발이 넓다, 눈이 높다, 귀가 얇다, 소 잃고 외양간 고친다)
2. MZ세대 신조어/슬랭 (예: 갓생, 혼밥, 존맛, 꿀잼, 레게노, 킹받다, 억텐, 스불재)
3. 인터넷 용어 (예: ㅋㅋ, ㄹㅇ, ㅇㅈ, 점메추, 저메추, 할많하않)
4. 드라마/K-POP에서 자주 나오는 표현
5. 2023-2024년 최신 유행어

## 난이도별 기준
- easy: MZ 슬랭, 인터넷 용어 위주 (젊은 세대가 SNS, 유튜브에서 실제로 쓰는 표현)
- medium: 일상 관용어 + 인기 신조어 혼합
- hard: 전통 속담, 사자성어, 어려운 관용어

## 응답 형식 (반드시 JSON으로만 응답)
{
  "question": "퀴즈 질문 (한국어)",
  "questionVi": "Câu hỏi (tiếng Việt)",
  "expression": "관용어/슬랭 표현",
  "hint": "힌트 (베트남어)",
  "options": [
    { "korean": "선택지1 (한국어)", "vietnamese": "Lựa chọn 1" },
    { "korean": "선택지2 (한국어)", "vietnamese": "Lựa chọn 2" },
    { "korean": "선택지3 (한국어)", "vietnamese": "Lựa chọn 3" },
    { "korean": "선택지4 (한국어)", "vietnamese": "Lựa chọn 4" }
  ],
  "correctIndex": 0,
  "explanation": "정답 해설 (한국어)",
  "explanationVi": "Giải thích đáp án (tiếng Việt)",
  "example": "예문 (한국어)",
  "exampleVi": "Ví dụ (tiếng Việt)",
  "category": "idiom/slang/internet/drama/proverb"
}

## 중요 규칙
- 매번 완전히 다른 표현을 출제하세요! 반복 금지!
- 한국에서 실제로 사용되는 자연스러운 표현만 출제
- 오답 선택지도 그럴듯하게 만들어 학습 효과를 높이세요
- 베트남어 번역은 자연스럽고 정확하게
- easy 난이도에서는 젊은 세대가 SNS, 유튜브, 틱톡에서 실제로 쓰는 표현 위주로
- 다양한 카테고리에서 골고루 출제 (관용어, 슬랭, 속담, 인터넷용어 등)`;

// Input validation
function validateDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (value === 'easy' || value === 'hard') return value;
  return 'medium';
}

function validateExcludeList(exclude: unknown): string[] {
  if (!Array.isArray(exclude)) return [];
  return exclude
    .filter((e): e is string => typeof e === 'string')
    .map(e => e.trim().slice(0, 100))
    .filter(e => e.length > 0)
    .slice(-200);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const X_AI_API_KEY = Deno.env.get('X_AI_API_KEY');

    if (!X_AI_API_KEY) {
      throw new Error('X_AI_API_KEY is not configured');
    }

    const difficulty = validateDifficulty(body.difficulty);
    const exclude = validateExcludeList(body.exclude);

    console.log(`Generating idiom quiz - Difficulty: ${difficulty}, Excluded: ${exclude.length} expressions`);

    const excludeText = exclude.length > 0
      ? `\n\n절대 출제하면 안 되는 표현들 (이미 나온 것들): ${exclude.join(', ')}`
      : '';

    const userPrompt = `난이도: ${difficulty}
${excludeText}

위 조건에 맞는 새로운 관용어/슬랭 퀴즈를 1개 출제해주세요.
반드시 제외 목록에 없는 완전히 새로운 표현을 사용하세요.
다양한 카테고리에서 골고루 출제하세요.`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${X_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.0,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('X AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: '서버가 바쁩니다. 잠시 후 다시 시도해주세요.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`X AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('X AI response received');

    const content = data.choices?.[0]?.message?.content;
    
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
      // Fallback response
      parsedResponse = {
        question: "\"갓생\"의 의미는 무엇일까요?",
        questionVi: "Ý nghĩa của \"갓생\" là gì?",
        expression: "갓생",
        hint: "Từ kết hợp giữa 'God' và '인생' (cuộc sống)",
        options: [
          { korean: "신처럼 완벽한 하루를 보내는 것", vietnamese: "Sống một ngày hoàn hảo như thần" },
          { korean: "게임에서 신급 플레이를 하는 것", vietnamese: "Chơi game ở cấp độ thần" },
          { korean: "종교적인 삶을 사는 것", vietnamese: "Sống cuộc sống tôn giáo" },
          { korean: "부모님처럼 사는 것", vietnamese: "Sống như bố mẹ" }
        ],
        correctIndex: 0,
        explanation: "갓생은 'God(신)'과 '인생'의 합성어로, 부지런하고 생산적인 하루를 보내는 것을 뜻하는 MZ세대 신조어입니다.",
        explanationVi: "갓생 là từ ghép của 'God' và '인생' (cuộc sống), là từ lóng của thế hệ MZ có nghĩa là sống một ngày chăm chỉ và hiệu quả.",
        example: "오늘 아침 6시에 일어나서 운동하고 공부도 했어. 완전 갓생이지!",
        exampleVi: "Hôm nay mình dậy lúc 6 giờ sáng, tập thể dục và học bài nữa. Đúng là sống kiểu thần!",
        category: "slang"
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in idiom-quiz function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: '서버 오류가 발생했습니다.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
