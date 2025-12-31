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
  explanation_vi: string;
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

      // 랜덤 유형 선택 (vocabulary: 어휘, grammar: 문법, expression: 표현)
      const questionTypes = ["vocabulary", "grammar"] as const;
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      let question: QuizQuestion | null = null;

      if (randomType === "vocabulary") {
        // 어휘 문제: topik_vocabulary에서 랜덤 선택
        const { data: vocab, error } = await supabase
          .from("topik_vocabulary")
          .select("id, word, meaning_vi, example_sentence, example_sentence_vi, level")
          .not("meaning_vi", "is", null)
          .not("example_sentence", "is", null)
          .limit(20);

        if (!error && vocab && vocab.length > 0) {
          const randomVocab = vocab[Math.floor(Math.random() * vocab.length)];
          
          // 오답 보기 생성 (같은 레벨의 다른 단어들)
          const { data: distractors } = await supabase
            .from("topik_vocabulary")
            .select("meaning_vi")
            .eq("level", randomVocab.level)
            .neq("id", randomVocab.id)
            .not("meaning_vi", "is", null)
            .limit(10);

          const wrongAnswers = distractors
            ?.map(d => d.meaning_vi!)
            .filter(m => m !== randomVocab.meaning_vi)
            .slice(0, 3) || ["nghĩa 1", "nghĩa 2", "nghĩa 3"];

          const correctAnswer = randomVocab.meaning_vi!;
          const allOptions = [correctAnswer, ...wrongAnswers];
          
          // 섞기
          for (let i = allOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
          }

          const correctIndex = allOptions.indexOf(correctAnswer);

          question = {
            id: `vocab-${randomVocab.id}`,
            type: "vocabulary",
            question: `'${randomVocab.word}'의 뜻은 무엇인가요?`,
            options: allOptions,
            correctIndex,
            explanation_ko: `'${randomVocab.word}'는 '${correctAnswer}'를 의미합니다.\n예: ${randomVocab.example_sentence || ""}`,
            explanation_vi: `'${randomVocab.word}' có nghĩa là '${correctAnswer}'.\nVí dụ: ${randomVocab.example_sentence_vi || randomVocab.example_sentence || ""}`,
            difficulty: randomVocab.level <= 2 ? "easy" : randomVocab.level <= 4 ? "medium" : "hard",
          };
        }
      } else if (randomType === "grammar") {
        // 문법 문제: grammar_ox_questions에서 선택
        const { data: grammarQuestions, error } = await supabase
          .from("grammar_ox_questions")
          .select("id, statement, is_correct, explanation, explanation_vi, level")
          .not("explanation_vi", "is", null)
          .limit(20);

        if (!error && grammarQuestions && grammarQuestions.length > 0) {
          const randomGrammar = grammarQuestions[Math.floor(Math.random() * grammarQuestions.length)];
          
          // OX 문제를 4지선다로 변환
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
            question: `다음 문장을 평가하세요: "${randomGrammar.statement}"`,
            options: allOptions,
            correctIndex,
            explanation_ko: randomGrammar.explanation,
            explanation_vi: randomGrammar.explanation_vi || randomGrammar.explanation,
            difficulty: randomGrammar.level <= 2 ? "easy" : randomGrammar.level <= 4 ? "medium" : "hard",
          };
        }
      }

      // 문제 생성 실패 시 fallback
      if (!question) {
        question = {
          id: `fallback-${Date.now()}`,
          type: "vocabulary",
          question: "'감사합니다'의 뜻은 무엇인가요?",
          options: ["고맙습니다", "미안합니다", "안녕하세요", "잘 가세요"],
          correctIndex: 0,
          explanation_ko: "'감사합니다'는 '고맙습니다'와 같은 뜻으로, 감사를 표현할 때 사용합니다.",
          explanation_vi: "'감사합니다' có nghĩa là 'cảm ơn', dùng để bày tỏ lòng biết ơn.",
          difficulty: "easy",
        };
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