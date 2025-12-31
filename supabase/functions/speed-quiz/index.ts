import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface QuizQuestion {
  id: string;
  type: "vocabulary" | "grammar" | "expression";
  question: string;
  options: string[];
  correctIndex: number;
  explanation_ko: string;
  explanation_vi: string;
  difficulty: "easy" | "medium" | "hard";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, answer, questionId, usedQuestionIds = [] } = await req.json();

    if (action === "generate") {
      // Generate a new quiz question using AI
      const systemPrompt = `당신은 한국어 학습 퀴즈를 생성하는 AI입니다.
TOPIK I~II 초중급 수준의 문제를 생성해주세요.

문제 유형을 랜덤하게 선택하세요:
1. vocabulary: 단어의 뜻 맞추기
2. grammar: 문법 패턴 완성하기  
3. expression: 상황에 맞는 표현 고르기

반드시 JSON 형식으로 응답하세요:
{
  "type": "vocabulary" | "grammar" | "expression",
  "question": "문제 내용 (한국어)",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0-3 중 정답 인덱스,
  "explanation_ko": "정답 설명 (한국어, 2줄 이내)",
  "explanation_vi": "Giải thích đáp án (tiếng Việt, 2 dòng)",
  "difficulty": "easy" | "medium" | "hard"
}

예시 문제 유형:
- "다음 단어의 뜻은? '행복하다'" → ① 슬프다 ② 기쁘다 ③ 화나다 ④ 무섭다
- "빈칸에 알맞은 말은? '저는 학교___ 갑니다.'" → ① 에 ② 을 ③ 이 ④ 와
- "식당에서 주문할 때 사용하는 표현은?" → ① 잘 먹겠습니다 ② 안녕하세요 ③ 이거 주세요 ④ 감사합니다

다양한 주제와 난이도로 생성해주세요.`;

      const userPrompt = `새로운 한국어 퀴즈 문제를 1개 생성해주세요.
이미 사용된 문제 ID들: ${JSON.stringify(usedQuestionIds)}
위 ID들과 다른 새로운 문제를 만들어주세요.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        console.error("AI gateway error:", response.status);
        // Fallback question
        return new Response(
          JSON.stringify({
            id: `fallback-${Date.now()}`,
            type: "vocabulary",
            question: "'감사합니다'의 뜻은 무엇인가요?",
            options: ["고맙습니다", "미안합니다", "안녕하세요", "잘 가세요"],
            correctIndex: 0,
            explanation_ko: "'감사합니다'는 '고맙습니다'와 같은 뜻으로, 감사를 표현할 때 사용합니다.",
            explanation_vi: "'감사합니다' có nghĩa là 'cảm ơn', dùng để bày tỏ lòng biết ơn.",
            difficulty: "easy",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      let question: Partial<QuizQuestion>;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          question = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Content:", content);
        question = {
          type: "vocabulary",
          question: "'학교'의 뜻은 무엇인가요?",
          options: ["공부하는 곳", "먹는 곳", "자는 곳", "운동하는 곳"],
          correctIndex: 0,
          explanation_ko: "'학교'는 학생들이 공부하는 교육 기관입니다.",
          explanation_vi: "'학교' là trường học, nơi học sinh đến để học tập.",
          difficulty: "easy",
        };
      }

      // Add unique ID
      const quizQuestion: QuizQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: question.type || "vocabulary",
        question: question.question || "",
        options: question.options || [],
        correctIndex: question.correctIndex ?? 0,
        explanation_ko: question.explanation_ko || "",
        explanation_vi: question.explanation_vi || "",
        difficulty: question.difficulty || "medium",
      };

      return new Response(JSON.stringify(quizQuestion), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      // Check answer (simple validation - answer checking is done client-side for speed)
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in speed-quiz:", error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
