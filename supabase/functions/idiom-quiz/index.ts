import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "grok-4-1-fast-non-reasoning";

type Difficulty = "easy" | "medium" | "hard";
type QuizType = "idiom" | "proverb" | "slang" | "internet";

type QuizPayload = {
  expression: string;
  type: QuizType;
  difficulty: Difficulty;
  hint_ko?: string;
  hint_vi?: string;
  correct_answer_ko: string;
  correct_answer_vi: string;
  correct_index: number;
  options: { ko: string; vi: string }[];
  explanation_ko: string;
  explanation_vi: string;
  example_sentence: string;
  example_translation: string;
};

const SYSTEM_PROMPT = `당신은 한국어 관용어/속담/슬랭/인터넷 용어 퀴즈 출제자입니다. 대상은 베트남 학습자입니다.

[문제 유형]
- idiom: 관용어
- proverb: 속담
- slang: MZ 유행어/신조어
- internet: 인터넷 표현(ㅋㅋ, ㄹㅇ 등)

[난이도]
- easy: MZ/인터넷 표현 비중 높게 (실제 SNS/유튜브/틱톡에서 쓰는 표현)
- medium: 일상 관용어 + 인기 신조어 혼합
- hard: 전통 속담/사자성어/난이도 높은 관용어

[절대 규칙]
- 매번 완전히 새로운 표현(= expression)을 출제하세요. 제외 목록에 있는 표현은 절대 사용 금지.
- 한국에서 실제로 자연스럽게 쓰이는 표현만.
- 보기 4개는 모두 그럴듯하게.
- 한국어/베트남어는 자연스럽고 정확하게.

[응답 형식]
반드시 아래 JSON 스키마로만 응답(마크다운/추가 텍스트 금지):
{
  "expression": string,
  "type": "idiom"|"proverb"|"slang"|"internet",
  "difficulty": "easy"|"medium"|"hard",
  "hint_ko": string,
  "hint_vi": string,
  "options": [
    {"ko": string, "vi": string},
    {"ko": string, "vi": string},
    {"ko": string, "vi": string},
    {"ko": string, "vi": string}
  ],
  "correct_index": 0|1|2|3,
  "correct_answer_ko": string,
  "correct_answer_vi": string,
  "explanation_ko": string,
  "explanation_vi": string,
  "example_sentence": string,
  "example_translation": string
}

추가 규칙:
- options[correct_index].ko/vi는 반드시 정답 의미와 일치해야 합니다.
- explanation에는 왜 그 의미인지를 간단명료하게 설명하세요.`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateDifficulty(value: unknown): Difficulty {
  if (value === "easy" || value === "hard") return value;
  return "medium";
}

function validateExcludeList(exclude: unknown): string[] {
  if (!Array.isArray(exclude)) return [];
  return exclude
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim().slice(0, 120))
    .filter((e) => e.length > 0)
    .slice(-300);
}

function extractFirstJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown, maxLen = 600): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

function looksLikeQuizPayload(v: unknown): v is QuizPayload {
  if (!isRecord(v)) return false;

  const typeOk = v.type === "idiom" || v.type === "proverb" || v.type === "slang" || v.type === "internet";
  const diffOk = v.difficulty === "easy" || v.difficulty === "medium" || v.difficulty === "hard";

  if (!isNonEmptyString(v.expression, 60)) return false;
  if (!typeOk || !diffOk) return false;

  if (!Array.isArray(v.options) || v.options.length !== 4) return false;
  const optionsOk = v.options.every((o) => isRecord(o) && isNonEmptyString(o.ko) && isNonEmptyString(o.vi));
  if (!optionsOk) return false;

  if (typeof v.correct_index !== "number" || v.correct_index < 0 || v.correct_index > 3) return false;

  if (!isNonEmptyString(v.correct_answer_ko) || !isNonEmptyString(v.correct_answer_vi)) return false;
  if (!isNonEmptyString(v.explanation_ko, 1200) || !isNonEmptyString(v.explanation_vi, 1200)) return false;
  if (!isNonEmptyString(v.example_sentence, 300) || !isNonEmptyString(v.example_translation, 300)) return false;

  return true;
}

async function callXAI(params: {
  apiKey: string;
  prompt: string;
  temperature: number;
}): Promise<string> {
  const { apiKey, prompt, temperature } = params;

  const doFetch = () =>
    fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: 1024,
      }),
    });

  let resp = await doFetch();
  if (resp.status === 429) {
    await sleep(450);
    resp = await doFetch();
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("X AI API error:", resp.status, t);
    return JSON.stringify({
      error: "Rate limit exceeded",
      message: "서버가 바쁩니다. 잠시 후 다시 시도해주세요.",
    });
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Empty AI response content");
  }
  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const X_AI_API_KEY = Deno.env.get("X_AI_API_KEY");

    if (!X_AI_API_KEY) throw new Error("X_AI_API_KEY is not configured");

    const difficulty = validateDifficulty(body.difficulty);
    const exclude = validateExcludeList(body.exclude ?? body.usedExpressions ?? body.used_expressions);

    console.log(
      `Generating idiom quiz - Model: ${MODEL} / Difficulty: ${difficulty}, Excluded: ${exclude.length}`,
    );

    const excludeText = exclude.length > 0
      ? `\n\n[제외 목록(이미 나온 표현)] ${exclude.join(" | ")}`
      : "";

    const basePrompt = `난이도: ${difficulty}${excludeText}\n\n위 조건에 맞는 새로운 퀴즈 1개를 출제해줘.`;

    const tryParse = (text: string): QuizPayload | null => {
      const jsonStr = extractFirstJsonObject(text);
      if (!jsonStr) return null;
      try {
        const obj = JSON.parse(jsonStr);
        return looksLikeQuizPayload(obj) ? obj : null;
      } catch {
        return null;
      }
    };

    // 1차
    let aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: basePrompt, temperature: 1.0 });
    let parsed = tryParse(aiText);

    // 2차(수정) - JSON 강제 + 제외목록 준수 강제
    if (!parsed || (exclude.length > 0 && exclude.includes(parsed.expression))) {
      const repairPrompt = `${basePrompt}\n\n[출력 규칙] 오직 JSON 객체 1개만 출력. 마크다운/추가 텍스트 금지.\n특히 expression은 제외 목록에 절대 포함되면 안 됨.`;
      aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: repairPrompt, temperature: 0.3 });
      parsed = tryParse(aiText);
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({
          error: "quiz_parse_failed",
          message: "문제 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in idiom-quiz function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "서버 오류가 발생했습니다.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
