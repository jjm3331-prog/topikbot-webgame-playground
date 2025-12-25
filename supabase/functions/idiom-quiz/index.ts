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

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("OpenAI embeddings error:", resp.status, t);
    throw new Error(`Embeddings error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.data?.[0]?.embedding ?? [];
}

function normalizeDifficulty(d: unknown): Difficulty {
  return d === "easy" || d === "hard" ? d : "medium";
}

function clampOptions(options: QuizOption[]): QuizOption[] {
  const cleaned = (options || [])
    .filter((o) => o && typeof o.ko === "string" && typeof o.vi === "string")
    .map((o) => ({ ko: o.ko.trim().slice(0, 120), vi: o.vi.trim().slice(0, 160) }))
    .filter((o) => o.ko && o.vi);

  // Ensure exactly 4 options (fallback trimming)
  return cleaned.slice(0, 4);
}

function validateQuestion(q: any): QuizQuestion {
  const difficulty: Difficulty = normalizeDifficulty(q?.difficulty);
  const type: QuizType =
    q?.type === "proverb" || q?.type === "slang" || q?.type === "internet" ? q.type : "idiom";

  const options = clampOptions(q?.options);
  let correct_index = Number.isFinite(q?.correct_index) ? Number(q.correct_index) : -1;

  if (correct_index < 0 || correct_index >= options.length) {
    // Try to infer from correct_answer_ko
    const ck = typeof q?.correct_answer_ko === "string" ? q.correct_answer_ko.trim() : "";
    correct_index = options.findIndex((o) => o.ko === ck);
  }

  if (options.length !== 4 || correct_index < 0) {
    throw new Error("Invalid quiz payload from model");
  }

  return {
    expression: String(q?.expression ?? "").trim().slice(0, 60),
    type,
    difficulty,
    hint_ko: String(q?.hint_ko ?? "").trim().slice(0, 200),
    hint_vi: String(q?.hint_vi ?? "").trim().slice(0, 260),
    correct_answer_ko: String(q?.correct_answer_ko ?? "").trim().slice(0, 120),
    correct_answer_vi: String(q?.correct_answer_vi ?? "").trim().slice(0, 160),
    correct_index,
    options,
    explanation_ko: String(q?.explanation_ko ?? "").trim().slice(0, 900),
    explanation_vi: String(q?.explanation_vi ?? "").trim().slice(0, 900),
    example_sentence: String(q?.example_sentence ?? "").trim().slice(0, 200),
    example_translation: String(q?.example_translation ?? "").trim().slice(0, 260),
  };
}

async function generateQuizWithXai({
  difficulty,
  usedExpressions,
  ragContent,
}: {
  difficulty: Difficulty;
  usedExpressions: string[];
  ragContent: string;
}): Promise<QuizQuestion> {
  const X_AI_API_KEY = Deno.env.get("X_AI_API_KEY");
  if (!X_AI_API_KEY) throw new Error("X_AI_API_KEY not configured");

  const difficultyGuide =
    difficulty === "easy"
      ? "초급: 일상/인터넷 표현 위주, 매우 직관적인 오답/정답"
      : difficulty === "hard"
        ? "고급: 관용구/속담/추상적 표현 포함, 오답은 매우 그럴듯하게"
        : "중급: 실생활+관용표현 섞기, 오답은 흔한 오해 포인트를 찌르기";

  const system = `당신은 한국어 표현(관용어/속담/슬랭) 학습용 퀴즈를 만드는 전문가입니다.
대상: 베트남어 학습자.

규칙:
- 출력은 오직 JSON 1개만. (마크다운/설명 금지)
- Vietnamese(vi)는 번역투 금지, 자연스러운 네이티브 문장
- 보기(options)는 4개, correct_index는 0~3
- correct_answer_ko/vi는 options[correct_index]와 일치
- usedExpressions(이미 출제됨)와 중복되는 expression은 절대 금지

난이도 가이드: ${difficultyGuide}
`;

  const user = `아래 스키마로 퀴즈 1개를 생성하세요.

스키마:
{
  "expression": "...",
  "type": "idiom|proverb|slang|internet",
  "difficulty": "easy|medium|hard",
  "hint_ko": "...",
  "hint_vi": "...",
  "correct_answer_ko": "...",
  "correct_answer_vi": "...",
  "correct_index": 0,
  "options": [{"ko":"...","vi":"..."}, {"ko":"...","vi":"..."}, {"ko":"...","vi":"..."}, {"ko":"...","vi":"..."}],
  "explanation_ko": "정답 근거 + 오답 3개가 왜 틀린지(짧게) 포함",
  "explanation_vi": "Giải thích: vì sao đúng + vì sao 3 đáp án sai",
  "example_sentence": "... (한국어 예문)",
  "example_translation": "... (베트남어 번역)"
}

난이도: ${difficulty}

금지 expression 목록(중복 금지):
${usedExpressions.slice(-200).join("\n")}

[RAG 참고자료]
${ragContent || "(없음)"}
`;

  const primaryModel = "grok-4-1-fast-reasoning";
  const fallbackModel = "grok-4.1-fast-reasoning";

  let resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${X_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: primaryModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: difficulty === "hard" ? 0.7 : 0.9,
    }),
  });

  if (!resp.ok && (resp.status === 400 || resp.status === 404)) {
    const t = await resp.text().catch(() => "");
    console.warn("xAI model rejected, retrying with fallback model:", resp.status, t);

    resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${X_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: fallbackModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: difficulty === "hard" ? 0.7 : 0.9,
      }),
    });
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("xAI API error:", resp.status, t);
    throw new Error(`xAI API error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonStr = safeExtractJsonObject(content);
  if (!jsonStr) throw new Error("Failed to parse model JSON");

  return validateQuestion(JSON.parse(jsonStr));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const difficulty = normalizeDifficulty(body.difficulty);

    const userId = typeof body.userId === "string" ? body.userId.trim().slice(0, 100) : null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 100) : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Used expressions
    let usedExpressions: string[] = [];
    if (userId) {
      const { data } = await supabase
        .from("quiz_history")
        .select("expression")
        .eq("user_id", userId)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(500);
      usedExpressions = data?.map((r) => r.expression) || [];
    } else if (sessionId) {
      const { data } = await supabase
        .from("quiz_history")
        .select("expression")
        .eq("session_id", sessionId)
        .eq("difficulty", difficulty)
        .order("created_at", { ascending: false })
        .limit(500);
      usedExpressions = data?.map((r) => r.expression) || [];
    }

    // 2) RAG: query knowledge base for idioms/proverbs/etc.
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    let ragContent = "";

    try {
      if (openAIApiKey) {
        const ragQuery = `한국어 관용어/속담/유행어/인터넷 표현: 뜻, 뉘앙스, 예문, 흔한 오해. 난이도=${difficulty}`;
        const emb = await generateEmbedding(ragQuery, openAIApiKey);
        const { data: results } = await supabase.rpc("search_knowledge", {
          query_embedding: JSON.stringify(emb),
          match_threshold: 0.45,
          match_count: 8,
        });

        if (results?.length) {
          ragContent = results
            .map((r: any, i: number) => `[#${i + 1}] ${r.document_title}\n${r.content}`)
            .join("\n\n---\n\n");
        }
      }
    } catch (e) {
      console.error("RAG error (continuing with LLM fallback)", e);
    }

    // 3) LLM generation (even if ragContent empty)  -> this is the requested 'fallback uses LLM'
    const quiz = await generateQuizWithXai({ difficulty, usedExpressions, ragContent });

    // 4) Persist expression for de-dup
    await supabase.from("quiz_history").insert({
      user_id: userId || null,
      session_id: sessionId || null,
      difficulty,
      expression: quiz.expression,
    });

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in idiom-quiz function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
