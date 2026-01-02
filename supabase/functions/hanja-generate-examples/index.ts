import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface HanjaWord {
  id: string;
  word: string;
  meaning_ko: string | null;
  meaning_vi: string | null;
  meaning_en: string | null;
  meaning_ja: string | null;
  meaning_zh: string | null;
}

interface GeneratedContent {
  definition_ko: string;
  definition_en: string;
  definition_vi: string;
  definition_ja: string;
  definition_zh: string;
  definition_ru: string;
  definition_uz: string;
  example_sentence: string;
  example_translation_en: string;
  example_translation_vi: string;
  example_translation_ja: string;
  example_translation_zh: string;
  example_translation_ru: string;
  example_translation_uz: string;
}

async function generateExamplesForWord(word: HanjaWord): Promise<GeneratedContent | null> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  const prompt = `당신은 한국어 교육 전문가입니다. 한자어 단어에 대한 상세한 정의와 예문을 생성해주세요.

단어: ${word.word}
의미: ${word.meaning_ko || ""}

다음 JSON 형식으로 정확히 응답해주세요 (다른 텍스트 없이 JSON만):
{
  "definition_ko": "한국어로 된 상세한 정의 (2-3문장)",
  "definition_en": "English definition (2-3 sentences)",
  "definition_vi": "Định nghĩa tiếng Việt (2-3 câu)",
  "definition_ja": "日本語の定義（2-3文）",
  "definition_zh": "中文定义（2-3句）",
  "definition_ru": "Определение на русском (2-3 предложения)",
  "definition_uz": "O'zbek tilidagi ta'rif (2-3 gap)",
  "example_sentence": "자연스러운 한국어 예문 (초중급 학습자용)",
  "example_translation_en": "English translation of example",
  "example_translation_vi": "Bản dịch tiếng Việt của ví dụ",
  "example_translation_ja": "例文の日本語訳",
  "example_translation_zh": "例句的中文翻译",
  "example_translation_ru": "Русский перевод примера",
  "example_translation_uz": "Misol tarjimasi o'zbek tilida"
}

중요:
- 예문은 TOPIK I-II 수준에 적합하게 작성
- 모든 번역은 자연스럽고 정확하게
- JSON 형식만 반환, 추가 설명 없음`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a Korean language education expert. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      console.error("LLM API error:", response.status, bodyText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in LLM response");
      return null;
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr) as GeneratedContent;
    return parsed;
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    console.error(
      "Error generating examples for word:",
      word.word,
      isAbort ? "(timeout)" : error,
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dayNumber, batchSize = 5, skipExisting = true } = await req.json();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Hard cap per-request work to avoid function timeouts.
    const effectiveBatchSize = Math.max(1, Math.min(Number(batchSize) || 1, 5));
    const requestStartedAt = Date.now();
    const TIME_BUDGET_MS = 25_000;

    // Get the day ID
    const { data: day, error: dayError } = await supabase
      .from("hanja_days")
      .select("id")
      .eq("day_number", dayNumber)
      .single();

    if (dayError || !day) {
      return new Response(
        JSON.stringify({ error: `Day ${dayNumber} not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get roots for this day
    const { data: roots, error: rootsError } = await supabase
      .from("hanja_roots")
      .select("id")
      .eq("day_id", day.id);

    if (rootsError || !roots?.length) {
      return new Response(
        JSON.stringify({ error: `No roots found for day ${dayNumber}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rootIds = roots.map((r) => r.id);

    // Get words for these roots
    let wordsQuery = supabase
      .from("hanja_words")
      .select("id, word, meaning_ko, meaning_vi, meaning_en, meaning_ja, meaning_zh")
      .in("root_id", rootIds);

    // Skip words that already have examples if requested
    if (skipExisting) {
      wordsQuery = wordsQuery.or("example_sentence.is.null,example_sentence.eq.");
    }

    const { data: words, error: wordsError } = await wordsQuery.limit(effectiveBatchSize);

    if (wordsError) {
      throw wordsError;
    }

    if (!words?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All words already have examples",
          processed: 0,
          remaining: 0,
          time_budget_reached: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process words
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      words: [] as { word: string; status: string }[],
      time_budget_reached: false,
    };

    for (const word of words) {
      if (Date.now() - requestStartedAt > TIME_BUDGET_MS) {
        results.time_budget_reached = true;
        break;
      }

      const generated = await generateExamplesForWord(word);

      if (generated) {
        const { error: updateError } = await supabase
          .from("hanja_words")
          .update({
            definition_ko: generated.definition_ko,
            definition_en: generated.definition_en,
            definition_vi: generated.definition_vi,
            definition_ja: generated.definition_ja,
            definition_zh: generated.definition_zh,
            definition_ru: generated.definition_ru,
            definition_uz: generated.definition_uz,
            example_sentence: generated.example_sentence,
            example_translation_en: generated.example_translation_en,
            example_translation_vi: generated.example_translation_vi,
            example_translation_ja: generated.example_translation_ja,
            example_translation_zh: generated.example_translation_zh,
            example_translation_ru: generated.example_translation_ru,
            example_translation_uz: generated.example_translation_uz,
          })
          .eq("id", word.id);

        if (updateError) {
          console.error("Update error for word:", word.word, updateError);
          results.failed++;
          results.words.push({ word: word.word, status: "update_failed" });
        } else {
          results.success++;
          results.words.push({ word: word.word, status: "success" });
        }
      } else {
        results.failed++;
        results.words.push({ word: word.word, status: "generation_failed" });
      }

      results.processed++;

      // Small delay to reduce 429 rate-limits from AI gateway
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Count remaining words without examples
    const { count: remainingCount } = await supabase
      .from("hanja_words")
      .select("id", { count: "exact", head: true })
      .in("root_id", rootIds)
      .or("example_sentence.is.null,example_sentence.eq.");

    return new Response(
      JSON.stringify({
        dayNumber,
        processed: results.processed,
        success: results.success,
        failed: results.failed,
        words: results.words,
        remaining: remainingCount || 0,
        time_budget_reached: results.time_budget_reached,
        effective_batch_size: effectiveBatchSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("hanja-generate-examples error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
