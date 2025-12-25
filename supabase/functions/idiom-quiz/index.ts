import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Difficulty = "easy" | "medium" | "hard";
type QuizType = "idiom" | "proverb" | "slang" | "internet";

type QuizOption = { ko: string; vi: string };

type QuizQuestion = {
  expression: string;
  type: QuizType;
  difficulty: Difficulty;
  hint_ko: string;
  hint_vi: string;
  correct_answer_ko: string;
  correct_answer_vi: string;
  correct_index: number;
  options: QuizOption[];
  explanation_ko: string;
  explanation_vi: string;
  example_sentence: string;
  example_translation: string;
};

function safeExtractJsonObject(raw: string): string | null {
  const m = raw.match(/\{[\s\S]*\}/);
  return m?.[0] ?? null;
}

async function generateQuizWithLovableAI({
  difficulty,
  usedExpressions,
}: {
  difficulty: Difficulty;
  usedExpressions: string[];
}): Promise<QuizQuestion> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const difficultyGuide =
    difficulty === "easy"
      ? "쉬운 관용어/속담"
      : difficulty === "medium"
      ? "중급 관용어/속담"
      : "고급/신조어/인터넷 용어";

  const systemPrompt = `당신은 한국어 관용어/속담/유행어 전문가입니다.
사용자: 베트남인 학습자

규칙:
1. 출력은 오직 JSON 하나만 (마크다운 금지)
2. 베트남어는 번역투 금지, 네이티브 표현
3. 난이도: ${difficultyGuide}

JSON 스키마:
{
  "expression": "한국어 표현",
  "type": "idiom" | "proverb" | "slang" | "internet",
  "difficulty": "${difficulty}",
  "hint_ko": "힌트 (한국어)",
  "hint_vi": "Gợi ý (tiếng Việt)",
  "correct_answer_ko": "정답 뜻 (한국어)",
  "correct_answer_vi": "Đáp án (tiếng Việt)",
  "correct_index": 0,
  "options": [
    {"ko": "정답", "vi": "đáp án đúng"},
    {"ko": "오답1", "vi": "đáp án sai 1"},
    {"ko": "오답2", "vi": "đáp án sai 2"},
    {"ko": "오답3", "vi": "đáp án sai 3"}
  ],
  "explanation_ko": "왜 정답인지 설명 (한국어)",
  "explanation_vi": "Giải thích (tiếng Việt tự nhiên)",
  "example_sentence": "예문 (한국어)",
  "example_translation": "Câu ví dụ (tiếng Việt)"
}`;

  const userPrompt = `새로운 한국어 ${difficultyGuide} 퀴즈 1개를 JSON으로 생성하세요.

다음 표현들은 이미 사용되었으니 제외하세요:
${usedExpressions.slice(-100).join("\n") || "(없음)"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("[Idiom] Lovable AI error:", resp.status, t);
    throw new Error(`AI error: ${resp.status}`);
  }

  const aiData = await resp.json();
  const content = aiData.choices?.[0]?.message?.content || "";
  const jsonStr = safeExtractJsonObject(content);
  if (!jsonStr) throw new Error("Failed to parse quiz JSON");

  return JSON.parse(jsonStr) as QuizQuestion;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const difficulty: Difficulty =
      body.difficulty === "medium" || body.difficulty === "hard"
        ? body.difficulty
        : "easy";
    const userId: string | null = body.userId || null;

    console.log("[Idiom] request", { difficulty, userId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) 이미 사용된 표현 조회
    let usedExpressions: string[] = [];
    if (userId) {
      const { data: history } = await supabase
        .from("quiz_history")
        .select("expression")
        .eq("user_id", userId)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(200);
      usedExpressions = history?.map((h: any) => h.expression) || [];
    }

    // 2) LLM으로 퀴즈 생성
    const quiz = await generateQuizWithLovableAI({ difficulty, usedExpressions });

    // 3) 사용 기록 저장
    if (userId) {
      await supabase.from("quiz_history").insert({
        user_id: userId,
        difficulty,
        expression: quiz.expression,
      });
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[Idiom] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
