import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 한국어 관용어/슬랭 퀴즈 게임의 AI입니다.
베트남 학습자를 위해 한국어 표현을 가르칩니다.

퀴즈 유형 (균등하게 출제할 것!):
1. 관용어 (예: "발이 넓다", "눈이 높다", "손이 크다", "배가 아프다")
2. 속담 (예: "가는 말이 고와야 오는 말이 곱다", "호랑이도 제 말 하면 온다")
3. MZ세대 유행어/신조어 (예: "내로남불", "존버", "갑분싸", "오히려좋아", "어쩔티비", "저쩔냉장고", "킹받다", "쩔어", "레게노")
4. 인터넷 슬랭 (예: "ㅋㅋㅋ", "ㄹㅇ", "TMI", "JMT", "꿀잼", "노잼", "인싸", "아싸", "플렉스", "갓생", "멍때리다", "뇌절", "손민수")

난이도별 출제 비율:
- easy: 인터넷 슬랭 50%, MZ 유행어 30%, 쉬운 관용어 20%
- medium: MZ 유행어 40%, 관용어 30%, 속담 30%
- hard: 속담 40%, 어려운 관용어 40%, 신조어 20%

최신 MZ 슬랭 예시 (적극 활용):
- "킹받다" = 매우 화난다
- "어쩔티비" = 어쩌라고 + TV (상대 무시)
- "갑분싸" = 갑자기 분위기 싸해짐
- "JMT" = 존맛탱 (매우 맛있다)
- "TMI" = Too Much Information
- "플렉스" = 과시하다
- "갓생" = God + 생활 (열심히 사는 삶)
- "손민수" = 남이 가진 걸 따라 사는 것
- "뇌절" = 같은 말/행동 반복
- "오히려좋아" = 역으로 좋은 상황
- "레게노" = 레전드 (전설)

중요: 학습 효과를 위해 모든 보기에 한국어와 베트남어를 모두 제공하세요!

응답 형식 (JSON만):
{
  "expression": "한국어 표현",
  "type": "idiom" | "proverb" | "slang" | "internet",
  "difficulty": "easy" | "medium" | "hard",
  "hint_ko": "정답을 유추할 수 있는 힌트 (한국어, 2-3문장으로 표현의 유래나 사용 상황 설명)",
  "hint_vi": "Gợi ý giúp suy luận đáp án (tiếng Việt, 2-3 câu giải thích nguồn gốc hoặc ngữ cảnh sử dụng)",
  "correct_option": {
    "ko": "정답의 한국어 의미",
    "vi": "Nghĩa đúng bằng tiếng Việt"
  },
  "wrong_options": [
    { "ko": "오답1 한국어", "vi": "Đáp án sai 1" },
    { "ko": "오답2 한국어", "vi": "Đáp án sai 2" },
    { "ko": "오답3 한국어", "vi": "Đáp án sai 3" }
  ],
  "explanation_ko": "이 표현의 유래와 사용법 (한국어, MZ 슬랭이면 어디서 유래했는지도)",
  "explanation_vi": "Giải thích nguồn gốc và cách sử dụng (베트남어)",
  "example_sentence": "실제 대화 예문 (한국어)",
  "example_translation": "Ví dụ (베트남어 번역)"
}

주의: 
- correct_option은 반드시 정답이어야 합니다
- wrong_options는 반드시 3개의 오답을 포함해야 합니다
- hint_ko, hint_vi는 반드시 포함해야 합니다! 학습자가 정답을 유추할 수 있는 단서를 제공하세요.
- 난이도에 따라 슬랭/유행어 비율을 맞춰주세요!`;

// Input validation helpers
function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  if (value === 'easy' || value === 'hard') return value;
  return 'medium';
}

function validateUsedExpressions(expressions: unknown): string[] {
  if (!Array.isArray(expressions)) return [];
  return expressions
    .map(e => validateString(e, 100))
    .filter((e): e is string => e !== null)
    .slice(-50);
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
    const difficulty = validateDifficulty(body.difficulty);
    const usedExpressions = validateUsedExpressions(body.usedExpressions);

    const usedList = usedExpressions.join(", ") || "없음";
    const userMessage = `난이도: ${difficulty}
이미 출제된 표현들 (중복 금지): [${usedList}]
새로운 퀴즈 문제를 생성해주세요.`;

    console.log("Quiz request:", { difficulty, usedExpressionsCount: usedExpressions.length });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.9,
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

    interface QuizOption {
      ko: string;
      vi: string;
    }
    
    interface AIResponse {
      expression: string;
      type: string;
      difficulty: string;
      correct_option: QuizOption;
      wrong_options: QuizOption[];
      explanation_ko: string;
      explanation_vi: string;
      example_sentence: string;
      example_translation: string;
      options?: QuizOption[];
      correct_index?: number;
    }
    
    let parsedResponse: AIResponse;
    try {
      const jsonMatch = aiMessage.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiMessage.match(/```\s*([\s\S]*?)\s*```/) ||
                        aiMessage.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch?.[1] || jsonMatch?.[0] || aiMessage;
      parsedResponse = JSON.parse(jsonStr);
      
      // Shuffle options on server side to ensure correct_index is accurate
      const correctOption = parsedResponse.correct_option;
      const allOptions: QuizOption[] = [
        correctOption,
        ...parsedResponse.wrong_options
      ];
      
      // Fisher-Yates shuffle
      for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
      }
      
      // Find correct index after shuffle
      const correctIndex = allOptions.findIndex(
        opt => opt.ko === correctOption.ko
      );
      
      parsedResponse.options = allOptions;
      parsedResponse.correct_index = correctIndex;
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to generate quiz");
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Quiz error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
