import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_JOB_TYPES = ['convenience_store', 'cafe', 'restaurant', 'pc_bang', 'bookstore'] as const;
type JobType = typeof VALID_JOB_TYPES[number];

const JOB_CONTEXTS: Record<JobType, { name_ko: string; name_vi: string; situations: string[] }> = {
  convenience_store: {
    name_ko: '편의점',
    name_vi: 'Cửa hàng tiện lợi',
    situations: ['결제', '상품 찾기', '재고 확인', '환불', '담배/주류 판매', '택배 접수', '충전/결제 서비스']
  },
  cafe: {
    name_ko: '카페',
    name_vi: 'Quán cà phê',
    situations: ['음료 주문', '커스텀 요청', '테이크아웃/매장', '디저트 추천', '와이파이/콘센트 문의', '포인트 적립']
  },
  restaurant: {
    name_ko: '식당',
    name_vi: 'Nhà hàng',
    situations: ['메뉴 추천', '주문 받기', '알레르기 확인', '추가 주문', '계산', '예약 문의', '포장 요청']
  },
  pc_bang: {
    name_ko: 'PC방',
    name_vi: 'Quán net',
    situations: ['자리 안내', '시간 충전', '음식 주문', '프린트/스캔', '게임 설치 요청', '기기 문제']
  },
  bookstore: {
    name_ko: '서점',
    name_vi: 'Hiệu sách',
    situations: ['책 찾기', '재고 확인', '추천 요청', '포장 요청', '회원 가입', '주문/배송']
  }
};

const SYSTEM_PROMPT = `당신은 한국어 학습 게임 "K-Life"의 아르바이트 게임 AI입니다.
플레이어는 한국에서 아르바이트를 하며 손님을 응대합니다.

## 역할
- 당신은 손님 역할을 합니다
- 다양한 손님 캐릭터를 연기합니다 (친절한 손님, 급한 손님, 외국인 손님, 어르신 등)
- 실제 한국 아르바이트에서 마주치는 상황을 시뮬레이션합니다

## 응답 형식 (반드시 JSON으로만 응답)
{
  "customer_type": "손님 유형 (예: 급한 직장인, 친절한 아주머니, 외국인 관광객 등)",
  "customer_line_ko": "손님의 한국어 대사",
  "customer_line_vi": "Lời thoại của khách hàng bằng tiếng Việt",
  "situation_hint_ko": "현재 상황 설명 (한국어)",
  "situation_hint_vi": "Giải thích tình huống hiện tại (tiếng Việt)",
  "expected_response_hint_ko": "적절한 응대 힌트 (한국어, 너무 직접적이지 않게)",
  "expected_response_hint_vi": "Gợi ý phản hồi phù hợp (tiếng Việt)",
  "difficulty_modifier": "상황의 난이도 조절 설명"
}

## 난이도별 가이드
- easy: 단순한 요청, 천천히 말하는 손님, 기본적인 상황
- medium: 복잡한 요청, 일반 속도, 추가 질문이나 요구사항
- hard: 불만족한 손님, 빠른 말투, 복잡한 문제 해결, 클레임 상황

## 중요
- 실제 한국에서 사용하는 자연스러운 대화체 사용
- 손님마다 다른 말투와 성격 부여
- 문화적 뉘앙스 포함 (존댓말, 반말, 사투리 등)
- 학습자가 실제로 마주칠 상황 위주로`;

// Input validation helpers
function validateJobType(value: unknown): JobType {
  if (typeof value === 'string' && VALID_JOB_TYPES.includes(value as JobType)) {
    return value as JobType;
  }
  return 'convenience_store';
}

function validateDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (value === 'easy' || value === 'hard') return value;
  return 'medium';
}

function validateNumber(value: unknown, min: number, max: number): number {
  const num = typeof value === 'number' ? value : min;
  return Math.max(min, Math.min(max, Math.floor(num)));
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

    // Validate inputs
    const job_type = validateJobType(body.job_type);
    const difficulty = validateDifficulty(body.difficulty);
    const turn = validateNumber(body.turn, 1, 5);
    
    console.log(`Parttime job request: ${job_type}, difficulty: ${difficulty}, turn: ${turn}`);

    const jobContext = JOB_CONTEXTS[job_type];
    const randomSituation = jobContext.situations[Math.floor(Math.random() * jobContext.situations.length)];

    const userPrompt = `장소: ${jobContext.name_ko} (${jobContext.name_vi})
상황 유형: ${randomSituation}
난이도: ${difficulty}
현재 턴: ${turn}/5

이 상황에 맞는 손님 시나리오를 생성해주세요.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
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
      console.error('Gemini API error:', response.status);
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
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      parsedResponse = {
        customer_type: "일반 손님",
        customer_line_ko: "저기요, 이거 얼마예요?",
        customer_line_vi: "Xin lỗi, cái này bao nhiêu vậy?",
        situation_hint_ko: "손님이 가격을 묻고 있습니다",
        situation_hint_vi: "Khách hàng đang hỏi giá",
        expected_response_hint_ko: "가격을 안내해 드리세요",
        expected_response_hint_vi: "Hãy thông báo giá cho khách",
        difficulty_modifier: "기본 상황"
      };
    }

    return new Response(JSON.stringify({
      ...parsedResponse,
      job_type,
      job_name_ko: jobContext.name_ko,
      job_name_vi: jobContext.name_vi,
      turn,
      difficulty
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parttime-job function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
