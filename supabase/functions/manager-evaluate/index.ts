import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 채점 루브릭 정의
const SCORING_CRITERIA = {
  grammar: { weight: 40, description: '문법/조사/어미 정확도' },
  tone: { weight: 30, description: '높임말/공식/완곡 톤' },
  intent: { weight: 20, description: '요구한 구조 충족' },
  forbidden: { weight: 10, description: '금지어/리스크 회피' }
};

// 챕터별 미션 컨텍스트
const CHAPTER_CONTEXTS: Record<number, { situation: string; requirements: string[] }> = {
  1: {
    situation: '데뷔조 확정 후 탈락자에게 통보하는 상황. 탈락 연습생은 감정적으로 힘든 상태.',
    requirements: [
      '공감 표현 (1문장)',
      '사실관계 전달 (1문장)', 
      '대안 제시 (1문장)',
      '존댓말 사용',
      '완곡한 표현'
    ]
  },
  2: {
    situation: '연습생 멘탈 붕괴 상황. 대표는 녹음 강행 지시, 트레이너는 휴식 권유.',
    requirements: [
      '현재 상태 객관적 보고',
      '의학적/안전 근거',
      '대안 일정 제안',
      '공식 톤 유지'
    ]
  },
  3: {
    situation: 'PD와의 방송 협상. 조건(질문/편집/캐릭터화) 조율 필요.',
    requirements: [
      '상대 조건 존중 표현',
      '대신/다만 구조',
      '구체적 대안 제시',
      '윈윈 프레이밍'
    ]
  }
};

// 금지어 목록
const FORBIDDEN_WORDS = [
  '씨발', '개새끼', '병신', '지랄', // 욕설
  '죽어', '자살', // 위험 표현
  '확실히', '무조건', '절대' // 협상에서 피해야 할 단어
];

const SYSTEM_PROMPT = `당신은 한국어 학습 게임 "LUKATO 매니저"의 STT 채점 AI입니다.

역할: 사용자의 한국어 응답을 평가하고 피드백을 제공합니다.

채점 기준:
1. 문법 정확도 (40점): 조사, 어미, 문장 구조
2. 톤 적절성 (30점): 높임말/반말, 공식/친근, 완곡 표현
3. 의도 충족 (20점): 요구된 구조(공감-사실-대안 등) 준수
4. 금지어 회피 (10점): 부적절한 표현 사용 여부

⚠️ 응답 형식 (순수 JSON만, 다른 텍스트 없이):
{
  "scores": {
    "grammar": 숫자(0~40),
    "tone": 숫자(0~30),
    "intent": 숫자(0~20),
    "forbidden": 숫자(0~10)
  },
  "total_score": 숫자(0~100),
  "feedback_ko": "한국어 피드백",
  "feedback_vi": "베트남어 피드백",
  "better_expression": "더 좋은 표현 예시",
  "stat_changes": {
    "mental": 숫자(-10~10, 양수면 그냥 5 형태로, +5 아님),
    "chemistry": 숫자(-10~10),
    "media_tone": 숫자(-10~10),
    "rumor": 숫자(-5~5)
  },
  "result": "success" 또는 "warning" 또는 "fail"
}

⚠️ 중요: 숫자에 + 기호를 붙이지 마세요! (예: +5 ❌, 5 ✓)

result 기준:
- success: 70점 이상
- warning: 40-69점
- fail: 40점 미만`;

// JSON에서 +숫자를 숫자로 변환하는 함수
function sanitizeJsonNumbers(jsonStr: string): string {
  // +숫자 패턴을 숫자로 변환 (예: +5 -> 5, +10 -> 10)
  return jsonStr.replace(/:\s*\+(\d+)/g, ': $1');
}

function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

function validateNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || isNaN(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userResponse, chapterNumber, missionContext } = await req.json();

    // 입력 검증
    const validResponse = validateString(userResponse, 1000);
    const validChapter = validateNumber(chapterNumber, 1, 12);
    
    if (!validResponse) {
      return new Response(JSON.stringify({ error: '응답이 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 금지어 사전 체크
    const foundForbidden = FORBIDDEN_WORDS.filter(word => 
      validResponse.toLowerCase().includes(word)
    );

    // 챕터 컨텍스트 가져오기
    const chapterContext = CHAPTER_CONTEXTS[validChapter || 1] || CHAPTER_CONTEXTS[1];

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${SYSTEM_PROMPT}

상황: ${chapterContext.situation}
요구사항: ${chapterContext.requirements.join(', ')}
${missionContext ? `추가 컨텍스트: ${missionContext}` : ''}

사용자 응답: "${validResponse}"
${foundForbidden.length > 0 ? `⚠️ 감지된 금지어: ${foundForbidden.join(', ')}` : ''}

위 응답을 채점하고 JSON 형식으로만 응답하세요.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error('AI 채점 실패');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from:', text);
      throw new Error('채점 결과 파싱 실패');
    }

    // +숫자 형태를 숫자로 변환 후 파싱
    const sanitizedJson = sanitizeJsonNumbers(jsonMatch[0]);
    const result = JSON.parse(sanitizedJson);

    // 금지어 페널티 적용
    if (foundForbidden.length > 0) {
      result.scores.forbidden = Math.max(0, result.scores.forbidden - foundForbidden.length * 3);
      result.total_score = result.scores.grammar + result.scores.tone + result.scores.intent + result.scores.forbidden;
      result.stat_changes.rumor = (result.stat_changes.rumor || 0) + foundForbidden.length * 2;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Manager evaluate error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      scores: { grammar: 20, tone: 15, intent: 10, forbidden: 5 },
      total_score: 50,
      feedback_ko: '평가 중 오류가 발생했습니다.',
      feedback_vi: 'Đã xảy ra lỗi khi đánh giá.',
      result: 'warning'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
