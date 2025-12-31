import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuizQuestion {
  id: string;
  type: "vocabulary" | "grammar" | "expression";
  question: string;
  options: string[];
  correctIndex: number;
  explanation_ko: string;
  difficulty: "easy" | "medium" | "hard";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, usedQuestionIds = [] } = await req.json();

    if (action === "generate") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      let question: QuizQuestion | null = null;

      // 문법 문제만 사용 (한국어 전용)
      const { data: grammarQuestions, error } = await supabase
        .from("grammar_ox_questions")
        .select("id, statement, is_correct, explanation, level")
        .limit(50);

      if (!error && grammarQuestions && grammarQuestions.length > 0) {
        // 사용되지 않은 문제 필터링
        const availableQuestions = grammarQuestions.filter(
          (q) => !usedQuestionIds.includes(`grammar-${q.id}`)
        );

        const questionsToUse = availableQuestions.length > 0 ? availableQuestions : grammarQuestions;
        const randomGrammar = questionsToUse[Math.floor(Math.random() * questionsToUse.length)];

        // OX 문제를 4지선다로 변환 (한국어만)
        const correctOption = randomGrammar.is_correct ? "올바른 문장입니다" : "틀린 문장입니다";
        const wrongOption = randomGrammar.is_correct ? "틀린 문장입니다" : "올바른 문장입니다";

        const allOptions = [
          correctOption,
          wrongOption,
          "문법적으로 애매합니다",
          "상황에 따라 다릅니다"
        ];

        // 섞기
        for (let i = allOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
        }

        const correctIndex = allOptions.indexOf(correctOption);

        question = {
          id: `grammar-${randomGrammar.id}`,
          type: "grammar",
          question: `다음 문장을 평가하세요:\n"${randomGrammar.statement}"`,
          options: allOptions,
          correctIndex,
          explanation_ko: randomGrammar.explanation || "해설이 제공되지 않았습니다.",
          difficulty: randomGrammar.level <= 2 ? "easy" : randomGrammar.level <= 4 ? "medium" : "hard",
        };
      }

      // 문제 생성 실패 시 fallback (한국어)
      if (!question) {
        const fallbackQuestions: QuizQuestion[] = [
          {
            id: `fallback-${Date.now()}-1`,
            type: "grammar",
            question: '다음 문장을 평가하세요:\n"나는 어제 학교에 갔어요."',
            options: ["올바른 문장입니다", "틀린 문장입니다", "문법적으로 애매합니다", "상황에 따라 다릅니다"],
            correctIndex: 0,
            explanation_ko: "이 문장은 문법적으로 올바른 과거 시제 표현입니다.",
            difficulty: "easy",
          },
          {
            id: `fallback-${Date.now()}-2`,
            type: "grammar",
            question: '다음 문장을 평가하세요:\n"친구가 저한테 선물을 줬어요."',
            options: ["올바른 문장입니다", "틀린 문장입니다", "문법적으로 애매합니다", "상황에 따라 다릅니다"],
            correctIndex: 0,
            explanation_ko: "'저한테'와 '줬어요'가 올바르게 사용된 문장입니다.",
            difficulty: "easy",
          },
          {
            id: `fallback-${Date.now()}-3`,
            type: "grammar",
            question: '다음 문장을 평가하세요:\n"내일 비가 오면 집에서 쉴 거예요."',
            options: ["올바른 문장입니다", "틀린 문장입니다", "문법적으로 애매합니다", "상황에 따라 다릅니다"],
            correctIndex: 0,
            explanation_ko: "조건문 '-면'과 미래 표현 '-ㄹ 거예요'가 올바르게 사용되었습니다.",
            difficulty: "medium",
          },
        ];
        question = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      }

      return new Response(JSON.stringify(question), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
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
