// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeText(text: string, format: "text" | "html") {
  if (format === "html") return text.trim();
  return text.trim().replace(/\s+/g, " ");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkCache(supabase: any, cacheKey: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("ai_response_cache")
    .select("response, id")
    .eq("cache_key", cacheKey)
    .eq("function_name", "auto-translate")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;

  try {
    await supabase.rpc("increment_cache_hit", { p_id: data.id });
  } catch {
    // ignore
  }

  return data.response ?? null;
}

async function saveCache(
  supabase: any,
  cacheKey: string,
  payload: any,
  requestParams: any,
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await supabase.from("ai_response_cache").upsert(
    {
      cache_key: cacheKey,
      function_name: "auto-translate",
      response: payload,
      request_params: requestParams,
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
    },
    { onConflict: "cache_key" },
  );
}

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  ru: "Russian",
  uz: "Uzbek",
};

function systemPromptForSingle(format: "text" | "html", sourceLang: string, targetLang: string): string {
  const srcName = LANG_NAMES[sourceLang] || sourceLang;
  const tgtName = LANG_NAMES[targetLang] || targetLang;

  if (format === "html") {
    return `You are a professional translation engine. Translate from ${srcName} to ${tgtName}.

CRITICAL HTML TRANSLATION RULES:
1. Output MUST be valid JSON: {"translation":"<translated HTML here>"}
2. PRESERVE ALL HTML TAGS EXACTLY - do NOT add, remove, or reorder any tags
3. ONLY translate the visible text content between tags
4. Keep ALL tag attributes UNCHANGED
5. Preserve whitespace / line breaks inside the HTML
6. Do NOT wrap output in markdown code blocks`;
  }

  return `You are a professional translation engine. Translate from ${srcName} to ${tgtName}.

RULES:
1. Output MUST be valid JSON: {"translation":"<translated text here>"}
2. Preserve line breaks (\\n) when present in original
3. Do NOT add markdown unless it exists in the original`;
}

function systemPromptForSegments(sourceLang: string, targetLang: string, count: number): string {
  const srcName = LANG_NAMES[sourceLang] || sourceLang;
  const tgtName = LANG_NAMES[targetLang] || targetLang;

  return `You are a professional translation engine.
Translate from ${srcName} to ${tgtName}.

You will receive a JSON array of ${count} strings in the key "segments".
Return ONLY valid JSON in the exact shape:
{"translations":["...", "...", ...]}

STRICT RULES:
- The output array length MUST equal ${count}.
- Preserve leading/trailing whitespace INSIDE each string exactly as provided.
- Do NOT merge, split, reorder, or drop items.
- Do NOT wrap in markdown code blocks.`;
}

function extractJsonObject(raw: string): string {
  const m = raw.match(/\{[\s\S]*\}/);
  return m ? m[0] : raw;
}

function safeJsonParse(raw: string): any | null {
  const candidate = extractJsonObject(
    raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim(),
  );

  try {
    // Keep valid escapes; remove other control chars.
    let cleaned = candidate
      .replace(/\\n/g, "<<<NEWLINE>>>")
      .replace(/\\t/g, "<<<TAB>>>")
      .replace(/\\r/g, "<<<CR>>>")
      .replace(/\\\\/g, "<<<BACKSLASH>>>");

    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    cleaned = cleaned
      .replace(/<<<NEWLINE>>>/g, "\\n")
      .replace(/<<<TAB>>>/g, "\\t")
      .replace(/<<<CR>>>/g, "\\r")
      .replace(/<<<BACKSLASH>>>/g, "\\\\");

    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callGeminiTranslate(params: {
  systemPrompt: string;
  userPayload: string;
  apiKey: string;
}) {
  const { systemPrompt, userPayload, apiKey } = params;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "OK" }] },
          { role: "user", parts: [{ text: userPayload }] },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    return { ok: false as const, status: response.status, raw: errorText };
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { ok: true as const, raw };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    const sourceLanguage = body?.sourceLanguage;
    const targetLanguage = body?.targetLanguage;

    if (!sourceLanguage || !targetLanguage) {
      return new Response(JSON.stringify({ error: "sourceLanguage and targetLanguage are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sourceLanguage === targetLanguage) {
      // Pass-through for both modes.
      if (Array.isArray(body?.segments)) {
        return new Response(JSON.stringify({ translations: body.segments }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ translation: body?.text ?? "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // MODE A: segments[] (guaranteed structural preservation on the client)
    if (Array.isArray(body?.segments)) {
      const segments: unknown[] = body.segments;
      if (!segments.every((s) => typeof s === "string")) {
        return new Response(JSON.stringify({ error: "segments must be string[]" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const segs = segments as string[];
      const normalized = segs.map((s) => normalizeText(s, "text")).join("\n");
      const cacheKey = `auto_translate_segments_v1_${sourceLanguage}_${targetLanguage}_${await sha256Hex(normalized)}`;

      const cached = await checkCache(supabase, cacheKey);
      if (cached?.translations && Array.isArray(cached.translations)) {
        return new Response(JSON.stringify({ translations: cached.translations, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(
        `[auto-translate] segments mode: ${sourceLanguage}->${targetLanguage}, count=${segs.length}, chars=${normalized.length}`,
      );

      const systemPrompt = systemPromptForSegments(sourceLanguage, targetLanguage, segs.length);
      const userPayload = JSON.stringify({ segments: segs });

      const res = await callGeminiTranslate({
        systemPrompt,
        userPayload,
        apiKey: GEMINI_API_KEY,
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: "translation_failed" }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const parsed = safeJsonParse(res.raw);
      const translations = parsed?.translations;

      if (!Array.isArray(translations) || translations.length !== segs.length || !translations.every((s: any) => typeof s === "string")) {
        console.error("[auto-translate] segments parse/length mismatch", {
          expected: segs.length,
          got: Array.isArray(translations) ? translations.length : typeof translations,
        });
        return new Response(JSON.stringify({ error: "segment_translation_mismatch" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await saveCache(
        supabase,
        cacheKey,
        { translations },
        { sourceLanguage, targetLanguage, mode: "segments" },
      );

      return new Response(JSON.stringify({ translations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE B: single text/html
    const { text, format } = body;
    const effectiveFormat: "text" | "html" = format === "html" ? "html" : "text";

    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ translation: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizeText(text, effectiveFormat);
    const cacheKey = `auto_translate_v3_${effectiveFormat}_${sourceLanguage}_${targetLanguage}_${await sha256Hex(normalized)}`;

    const cached = await checkCache(supabase, cacheKey);
    if (cached?.translation && typeof cached.translation === "string") {
      return new Response(JSON.stringify({ translation: cached.translation, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = systemPromptForSingle(effectiveFormat, sourceLanguage, targetLanguage);
    const userPayload = effectiveFormat === "html"
      ? `Translate this HTML content. Remember: preserve ALL tags exactly, only translate visible text.\n\nHTML:\n${text}`
      : `Translate this text:\n\n${text}`;

    console.log(
      `[auto-translate] single mode: ${sourceLanguage}->${targetLanguage}, format=${effectiveFormat}, length=${text.length}`,
    );

    const res = await callGeminiTranslate({
      systemPrompt,
      userPayload,
      apiKey: GEMINI_API_KEY,
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "translation_failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = safeJsonParse(res.raw);
    let translation = (parsed?.translation ?? "").toString().trim();

    if (!translation) {
      console.error("[auto-translate] Empty translation result");
      return new Response(JSON.stringify({ error: "empty_translation", translation: text }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await saveCache(
      supabase,
      cacheKey,
      { translation },
      { sourceLanguage, targetLanguage, format: effectiveFormat, mode: "single" },
    );

    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in auto-translate:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
