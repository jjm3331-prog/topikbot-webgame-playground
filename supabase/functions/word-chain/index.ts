import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "grok-4-1-fast-non-reasoning";

const SYSTEM_PROMPT = `당신은 한국어 끝말잇기 게임의 AI이자 한국어 교사입니다.

규칙:
1. 상대방이 말한 단어의 마지막 글자로 시작하는 한국어 단어를 말해야 합니다
2. 이미 사용된 단어는 다시 사용할 수 없습니다
3. 명사 사용 가능 (고유명사도 허용! 지명, 인물, 음식명 등 모두 OK)
4. 한 글자 단어는 사용할 수 없습니다
5. 두음법칙을 적용합니다 (례→예, 렬→열, 리→이, 라→나, 녀→여, 뇨→요, 뉴→유, 니→이)

중요: 이 게임의 목적은 한국어 학습입니다!
- 각 단어에 대해 상세한 설명을 제공해주세요
- 베트남 학습자를 위해 베트남어로 뜻과 설명을 함께 제공합니다
- 다양한 주제의 단어를 사용하세요 (음식, 동물, 장소, 물건, 추상명사, 한국 문화 등)

응답 형식 (JSON만, 마크다운/설명 텍스트 금지):
{
  "valid": true/false,
  "reason_ko": "판정 이유 (한국어)",
  "reason_vi": "Lý do (베트남어)",
  "user_word_explanation": "사용자 단어의 뜻과 설명 (베트남어, 2-3문장)",
  "ai_word": "AI의 단어 (valid가 true일 때만)",
  "ai_word_meaning": "단어 뜻 (베트남어, 간단히)",
  "ai_word_explanation": "단어의 상세 설명, 예문, 문화적 맥락 등 (베트남어, 2-3문장)",
  "game_over": false,
  "winner": null
}

상대방 단어가 규칙에 어긋나면 valid: false, game_over: true, winner: "ai"
AI가 단어를 못 찾으면 valid: true, game_over: true, winner: "user"`;

const KOREAN_REGEX = /^[\uAC00-\uD7AF]+$/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

function validateKoreanWord(value: unknown): string | null {
  const word = validateString(value, 20);
  if (!word) return null;
  if (!KOREAN_REGEX.test(word)) return null;
  if (word.length < 2) return null;
  return word;
}

function validateUsedWords(words: unknown): string[] {
  if (!Array.isArray(words)) return [];
  return words
    .map((w) => validateKoreanWord(w))
    .filter((w): w is string => w !== null)
    .slice(-150);
}

function extractFirstJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown, maxLen = 2000): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= maxLen;
}

function isValidAiWordCandidate(params: {
  aiWord: unknown;
  lastChar: string | null;
  usedWords: string[];
}): boolean {
  const { aiWord, lastChar, usedWords } = params;
  if (!isNonEmptyString(aiWord, 40)) return false;
  const w = aiWord.trim();
  if (!KOREAN_REGEX.test(w)) return false;
  if (w.length < 2) return false;
  if (usedWords.includes(w)) return false;
  if (lastChar && w[0] !== lastChar) return false;
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
    throw new Error(`X AI API error: ${resp.status}`);
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

    const userWord = validateKoreanWord(body.userWord);
    const lastChar = validateString(body.lastChar, 1);

    // usedWords는 클라이언트에서 전달되지만, 안정성을 위해 서버에서도 보정
    const usedWords = validateUsedWords(body.usedWords);

    if (!userWord) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason_ko: "올바른 한국어 단어를 입력해주세요.",
          reason_vi: "Vui lòng nhập từ tiếng Hàn hợp lệ.",
          game_over: false,
          winner: null,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const usedWordsSafe = Array.from(new Set([...usedWords, userWord])).slice(-150);

    const usedWordsList = usedWordsSafe.join(", ");
    const basePrompt = lastChar
      ? `이전 단어의 마지막 글자: "${lastChar}". 사용자가 말한 단어: "${userWord}". 이미 사용된 단어들: [${usedWordsList}].\n\n이 단어가 규칙에 맞는지 확인하고, 맞다면 끝말잇기를 이어가세요.`
      : `게임 시작! 사용자가 첫 단어로 "${userWord}"를 말했습니다.\n\n이 단어가 유효한지 확인하고 끝말잇기를 이어가세요.`;

    // 1차 시도
    let aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: basePrompt, temperature: 0.8 });

    const tryParse = (text: string): Record<string, unknown> | null => {
      const jsonStr = extractFirstJsonObject(text);
      if (!jsonStr) return null;
      try {
        const obj = JSON.parse(jsonStr);
        return isRecord(obj) ? obj : null;
      } catch {
        return null;
      }
    };

    let parsed = tryParse(aiText);

    const needsRepair = (obj: Record<string, unknown> | null): boolean => {
      if (!obj) return true;
      if (typeof obj.valid !== "boolean") return true;
      if (obj.valid === true && obj.game_over !== true) {
        return !isValidAiWordCandidate({
          aiWord: obj.ai_word,
          lastChar: lastChar ?? null,
          usedWords: usedWordsSafe,
        });
      }
      return false;
    };

    // 2차(수정) 시도: JSON 강제 + 시작글자/중복 강제
    if (needsRepair(parsed)) {
      const repairPrompt = `${basePrompt}\n\n[출력 규칙] 오직 JSON 객체 1개만 출력. 마크다운/설명/텍스트 절대 금지.\n$${
        lastChar ? `ai_word는 반드시 "${lastChar}"로 시작해야 함.` : ""
      }\nai_word는 usedWords 목록에 없는 단어여야 함.`;
      aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: repairPrompt, temperature: 0.2 });
      parsed = tryParse(aiText);
    }

    if (!parsed) {
      return new Response(
        JSON.stringify({
          error: "AI 응답 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
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
    console.error("Word chain error:", error);

    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("429") ? 429 : 500;

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
