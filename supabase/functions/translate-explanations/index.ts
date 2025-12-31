import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface TranslateRequest {
  explanation_ko: string;
  targetLanguages?: string[];
}

interface TranslationResult {
  explanation_ko: string;
  explanation_vi: string;
  explanation_en: string;
  explanation_ja: string;
  explanation_zh: string;
  explanation_ru: string;
  explanation_uz: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English', 
  ja: 'Japanese',
  zh: 'Simplified Chinese',
  ru: 'Russian',
  uz: 'Uzbek'
};

// 번역 결과 검증 함수 - 각 언어별로 실제 번역이 됐는지 확인
function validateTranslation(lang: string, translation: string | undefined, originalKorean: string): { valid: boolean; reason?: string } {
  if (!translation || translation.trim() === '') {
    return { valid: false, reason: 'empty' };
  }
  
  // 원본과 동일하면 번역 실패로 간주
  if (translation.trim() === originalKorean.trim()) {
    return { valid: false, reason: 'same_as_original' };
  }
  
  // 최소 길이 검증 (원본의 20% 이상이어야 함)
  if (translation.length < originalKorean.length * 0.2) {
    return { valid: false, reason: 'too_short' };
  }
  
  // 언어별 특성 검증
  switch (lang) {
    case 'ja':
      // 일본어는 히라가나/가타카나/한자가 있어야 함
      if (!/[\u3040-\u30FF\u4E00-\u9FAF]/.test(translation)) {
        return { valid: false, reason: 'no_japanese_chars' };
      }
      break;
    case 'zh':
      // 중국어는 한자가 있어야 함
      if (!/[\u4E00-\u9FAF]/.test(translation)) {
        return { valid: false, reason: 'no_chinese_chars' };
      }
      break;
    case 'ru':
      // 러시아어는 키릴 문자가 있어야 함
      if (!/[\u0400-\u04FF]/.test(translation)) {
        return { valid: false, reason: 'no_cyrillic_chars' };
      }
      break;
    case 'vi':
      // 베트남어는 라틴 문자 + 성조 기호가 있어야 함
      if (!/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(translation)) {
        return { valid: false, reason: 'no_vietnamese_chars' };
      }
      break;
    case 'uz':
      // 우즈벡어는 라틴 문자 (특수문자 포함 가능)
      if (!/[a-zA-Z]/.test(translation)) {
        return { valid: false, reason: 'no_latin_chars' };
      }
      break;
    case 'en':
      // 영어는 라틴 문자가 있어야 함
      if (!/[a-zA-Z]/.test(translation)) {
        return { valid: false, reason: 'no_latin_chars' };
      }
      break;
  }
  
  return { valid: true };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function stripCodeFences(raw: string) {
  return raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function extractJsonObject(raw: string): string | null {
  const cleaned = stripCodeFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

function safeJsonParse(raw: string): any {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) throw new Error("NO_JSON_OBJECT_IN_RESPONSE");

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Retry once with minimal normalization (remove trailing commas)
    const normalized = jsonStr
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    return JSON.parse(normalized);
  }
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function translateWithGemini(koreanText: string, targetLanguages: string[]): Promise<TranslationResult> {
  const languageList = targetLanguages.map((lang) => `- ${lang}: ${LANGUAGE_NAMES[lang]}`).join("\n");
  const isLongExplanation = koreanText.length >= 200;

  let lastError = "";
  let lastValidationErrors: Record<string, string> = {};

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const feedback = Object.keys(lastValidationErrors).length
        ? `\n\nPrevious attempt failed validation for: ${JSON.stringify(lastValidationErrors)}.\nFix ONLY those languages and return ALL languages again.`
        : "";

      const prompt = `You are an expert translator specializing in Korean language education (TOPIK exam).
Translate the following Korean explanation into ${targetLanguages.length} languages.

${isLongExplanation ? `⚠️ This is a DETAILED explanation (${koreanText.length} characters).
Preserve ALL content. Do NOT summarize or shorten. Translate COMPLETELY.` : ""}

HARD RULES (MUST FOLLOW):
1) Output ONLY a single JSON object. No markdown, no commentary.
2) The JSON MUST include ALL keys exactly: ${targetLanguages.map((l) => `"${l}"`).join(", ")}
3) Each value MUST be a complete translation string (do not truncate).
4) Keep any Korean grammar terms / Korean example sentences in Hangul as-is.
5) Maintain formatting (line breaks, bullets) as closely as possible.
${feedback}

Korean explanation:
"""
${koreanText}
"""

Target languages (ALL REQUIRED):
${languageList}

Return JSON like:
{
${targetLanguages.map((lang) => `  "${lang}": "..."`).join(",\n")}
}`;

      console.log(`🔄 translate-explanations attempt ${attempt + 1}/5 (len=${koreanText.length})`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: isLongExplanation ? 12288 : 6144,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `GEMINI_HTTP_${response.status}: ${errorText}`;
        console.error("Gemini API error:", lastError);

        // Backoff on transient errors
        if (response.status === 429 || response.status === 503) {
          const backoff = 1200 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
          await sleep(backoff);
          continue;
        }

        throw new HttpError(response.status, lastError);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const translations = safeJsonParse(text) as Record<string, string>;

      const validationResults: Record<string, { valid: boolean; reason?: string }> = {};
      let allValid = true;
      lastValidationErrors = {};

      for (const lang of targetLanguages) {
        const value = translations?.[lang];
        const validation = validateTranslation(lang, value, koreanText);
        validationResults[lang] = validation;
        if (!validation.valid) {
          allValid = false;
          lastValidationErrors[lang] = validation.reason || "unknown";
        }
      }

      if (!allValid) {
        console.warn("⚠️ Validation failed:", lastValidationErrors);
        lastError = `VALIDATION_FAILED: ${JSON.stringify(lastValidationErrors)}`;
        const backoff = 800 * Math.pow(1.6, attempt) + Math.floor(Math.random() * 200);
        await sleep(backoff);
        continue;
      }

      const result: TranslationResult = {
        explanation_ko: koreanText,
        explanation_vi: translations.vi,
        explanation_en: translations.en,
        explanation_ja: translations.ja,
        explanation_zh: translations.zh,
        explanation_ru: translations.ru,
        explanation_uz: translations.uz,
      };

      console.log(`✅ Translation success - ${targetLanguages.length}/${targetLanguages.length} validated`);
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      console.error(`Attempt ${attempt + 1} failed:`, lastError);
      const backoff = 700 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await sleep(backoff);
      continue;
    }
  }

  throw new Error(`Translation failed after retries: ${lastError}. Validation errors: ${JSON.stringify(lastValidationErrors)}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { explanation_ko, targetLanguages = ['vi', 'en', 'ja', 'zh', 'ru', 'uz'] }: TranslateRequest = await req.json();

    if (!explanation_ko || explanation_ko.trim().length === 0) {
      throw new Error('explanation_ko is required');
    }

    console.log(`🌐 Translating explanation (${explanation_ko.length} chars) to ${targetLanguages.length} languages...`);

    const result = await translateWithGemini(explanation_ko, targetLanguages);

    console.log('✅ Translation completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof HttpError ? error.status : (errorMessage.includes('GEMINI_HTTP_429') ? 429 : 500);

    console.error('Translation error:', errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
