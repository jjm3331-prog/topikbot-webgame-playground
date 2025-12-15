import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "grok-4-1-fast-non-reasoning";

// 두음법칙 매핑 (역방향 포함)
const DUEUM_MAP: Record<string, string[]> = {
  '녀': ['여'],
  '뇨': ['요'],
  '뉴': ['유'],
  '니': ['이'],
  '랴': ['야'],
  '려': ['여'],
  '례': ['예'],
  '료': ['요'],
  '류': ['유'],
  '리': ['이'],
  '라': ['나'],
  '렬': ['열'],
  '률': ['율'],
  '륭': ['융'],
};

// 두음법칙 적용 가능한 글자 목록 (시작글자로 가능한 모든 변환)
function getValidStartChars(lastChar: string): string[] {
  const result = [lastChar];
  
  // 두음법칙 정방향: 원래 글자 → 변환된 글자
  if (DUEUM_MAP[lastChar]) {
    result.push(...DUEUM_MAP[lastChar]);
  }
  
  // 두음법칙 역방향: 변환된 글자 → 원래 글자
  for (const [original, converted] of Object.entries(DUEUM_MAP)) {
    if (converted.includes(lastChar)) {
      result.push(original);
    }
  }
  
  return [...new Set(result)];
}

const SYSTEM_PROMPT = `너는 한국어 끝말잇기 AI다. 베트남 학습자를 위해 게임하면서 단어를 가르친다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 [절대 규칙] AI 단어 선택 시 반드시 확인할 것
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ 사용자 단어의 **마지막 글자**를 확인한다
2️⃣ 그 글자로 **시작하는** 명사를 선택한다
3️⃣ 두음법칙이 적용되는 경우:
   - 녀→여, 뇨→요, 뉴→유, 니→이
   - 랴→야, 려→여, 례→예, 료→요, 류→유, 리→이  
   - 라→나, 렬→열, 률→율, 륭→융

예시:
- "사과" → 마지막 글자 "과" → "과일", "과자", "과학" (O)
- "병원" → 마지막 글자 "원" → "원숭이", "원피스" (O)
- "심장병" → 마지막 글자 "병" → "병원", "병아리" (O) / "심부름" (X - "심"으로 시작하면 안됨!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 [게임 규칙]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 명사만 사용 (2글자 이상)
- 이미 나온 단어 사용 금지
- 사용자 단어가 규칙 위반이면 → valid=false, game_over=true, winner="ai"
- AI가 단어를 못 찾으면 → valid=true, game_over=true, winner="user"
- 정상 진행 → valid=true, game_over=false, winner=null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 [베트남어 설명 작성법]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 구조: 핵심 정의 + 용도/특징 + 한국 문화 맥락
- 분량: 2-3문장 (50-80단어)
- 문체: 백과사전식, 객관적

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 [출력 형식] - 반드시 이 JSON만 출력
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "valid": true/false,
  "reason_ko": "한국어 판정 이유",
  "reason_vi": "Lý do tiếng Việt",
  "user_word_explanation": "사용자 단어 베트남어 설명 (50-80단어)",
  "ai_word": "AI의 단어 (사용자 단어 마지막 글자로 시작!)",
  "ai_word_meaning": "베트남어 뜻",
  "ai_word_explanation": "AI 단어 베트남어 설명 (50-80단어)",
  "game_over": true/false,
  "winner": null/"ai"/"user"
}

⚠️ 다른 텍스트 없이 JSON만 출력하라!`;

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

// 사용자 단어가 규칙에 맞는지 서버에서 직접 검증
function validateUserWordChain(params: {
  userWord: string;
  lastChar: string | null;
  usedWords: string[];
}): { valid: boolean; reason_ko: string; reason_vi: string } {
  const { userWord, lastChar, usedWords } = params;
  
  // 중복 체크
  // usedWords는 "이미 사용된 단어(이전 턴까지)"로 받는 것이 정석이지만,
  // 클라이언트가 실수로 현재 userWord를 마지막에 포함해 보내는 경우도 방어합니다.
  const occurrences = usedWords.filter((w) => w === userWord).length;
  const lastIsSame = usedWords.length > 0 && usedWords[usedWords.length - 1] === userWord;
  const isDuplicate = occurrences > 1 || (occurrences === 1 && !lastIsSame);

  if (isDuplicate) {
    return {
      valid: false,
      reason_ko: `"${userWord}"는 이미 사용된 단어입니다.`,
      reason_vi: `"${userWord}" đã được sử dụng rồi.`,
    };
  }
  
  // 첫 번째 단어는 끝말잇기 규칙 적용 안 함
  if (!lastChar) {
    return { valid: true, reason_ko: "", reason_vi: "" };
  }
  
  // 끝말잇기 규칙 체크 (두음법칙 적용)
  const validStarts = getValidStartChars(lastChar);
  const firstChar = userWord[0];
  
  if (!validStarts.includes(firstChar)) {
    return {
      valid: false,
      reason_ko: `"${userWord}"는 "${lastChar}"(으)로 시작해야 합니다. (두음법칙: ${validStarts.join(', ')})`,
      reason_vi: `"${userWord}" phải bắt đầu bằng "${lastChar}". (Quy tắc đầu âm: ${validStarts.join(', ')})`,
    };
  }
  
  return { valid: true, reason_ko: "", reason_vi: "" };
}

// AI 단어가 규칙에 맞는지 검증
function validateAiWord(params: {
  aiWord: unknown;
  requiredStartChar: string;
  usedWords: string[];
}): boolean {
  const { aiWord, requiredStartChar, usedWords } = params;
  
  if (!isNonEmptyString(aiWord, 40)) return false;
  
  const w = aiWord.trim();
  if (!KOREAN_REGEX.test(w)) return false;
  if (w.length < 2) return false;
  if (usedWords.includes(w)) return false;
  
  // AI 단어는 사용자 단어의 마지막 글자로 시작해야 함
  const validStarts = getValidStartChars(requiredStartChar);
  if (!validStarts.includes(w[0])) return false;
  
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

    // 서버에서 직접 사용자 단어 규칙 검증
    const userValidation = validateUserWordChain({
      userWord,
      lastChar,
      usedWords,
    });

    if (!userValidation.valid) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason_ko: userValidation.reason_ko,
          reason_vi: userValidation.reason_vi,
          user_word_explanation: "",
          ai_word: "",
          ai_word_meaning: "",
          ai_word_explanation: "",
          game_over: true,
          winner: "ai",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const usedWordsSafe = Array.from(new Set([...usedWords, userWord])).slice(-150);
    const userWordLastChar = userWord[userWord.length - 1];
    const validNextStarts = getValidStartChars(userWordLastChar);

    const basePrompt = `사용자 단어: "${userWord}" (마지막 글자: "${userWordLastChar}")
이미 사용된 단어: [${usedWordsSafe.join(", ")}]

★★★ 중요 ★★★
1. AI 단어(ai_word)는 반드시 "${validNextStarts.join('" 또는 "')}"(으)로 시작해야 합니다!
2. 이미 사용된 단어 목록에 있는 단어는 절대 사용하지 마세요!
3. JSON 형식으로만 응답하세요!

사용자 단어 "${userWord}"의 뜻을 베트남어로 설명하고, 끝말잇기를 이어가세요.`;

    // 1차 시도
    let aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: basePrompt, temperature: 0.7 });

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

    // AI 응답 검증
    const isAiWordValid = (obj: Record<string, unknown> | null): boolean => {
      if (!obj) return false;
      if (obj.valid !== true) return true; // valid가 false면 게임오버이므로 OK
      if (obj.game_over === true) return true; // 게임오버면 OK
      
      // valid=true이고 game_over가 아니면 ai_word 검증
      return validateAiWord({
        aiWord: obj.ai_word,
        requiredStartChar: userWordLastChar,
        usedWords: usedWordsSafe,
      });
    };

    // 2차 시도: AI 응답이 규칙 위반이면 재시도
    if (!isAiWordValid(parsed)) {
      console.log("1차 시도 실패, 재시도:", parsed?.ai_word);
      
      const repairPrompt = `${basePrompt}

[경고] 이전 응답의 ai_word가 규칙 위반입니다!
- ai_word는 반드시 "${validNextStarts[0]}"(으)로 시작해야 합니다
- 예시: "${validNextStarts[0]}자" "${validNextStarts[0]}리" "${validNextStarts[0]}음" 등
- 오직 JSON만 출력하세요!`;

      aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: repairPrompt, temperature: 0.3 });
      parsed = tryParse(aiText);
    }

    // 3차 시도: 여전히 실패하면 한 번 더
    if (!isAiWordValid(parsed)) {
      console.log("2차 시도 실패, 최종 시도:", parsed?.ai_word);
      
      const finalPrompt = `"${userWord}"의 마지막 글자는 "${userWordLastChar}"입니다.
"${validNextStarts[0]}"(으)로 시작하는 한국어 명사를 하나 말하세요.

사용 불가 단어: ${usedWordsSafe.join(", ")}

JSON 형식:
{
  "valid": true,
  "reason_ko": "정상",
  "reason_vi": "Hợp lệ",
  "user_word_explanation": "${userWord}의 베트남어 설명",
  "ai_word": "${validNextStarts[0]}???",
  "ai_word_meaning": "뜻",
  "ai_word_explanation": "설명",
  "game_over": false,
  "winner": null
}`;

      aiText = await callXAI({ apiKey: X_AI_API_KEY, prompt: finalPrompt, temperature: 0.1 });
      parsed = tryParse(aiText);
    }

    // 최종 검증 실패 시 AI 패배 처리
    if (!parsed || !isAiWordValid(parsed)) {
      console.log("모든 시도 실패, AI 패배 처리");
      return new Response(
        JSON.stringify({
          valid: true,
          reason_ko: `"${userWord}" 정상! AI가 "${userWordLastChar}"(으)로 시작하는 단어를 찾지 못했습니다.`,
          reason_vi: `"${userWord}" hợp lệ! AI không tìm được từ bắt đầu bằng "${userWordLastChar}".`,
          user_word_explanation: "",
          ai_word: "",
          ai_word_meaning: "",
          ai_word_explanation: "",
          game_over: true,
          winner: "user",
        }),
        {
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
