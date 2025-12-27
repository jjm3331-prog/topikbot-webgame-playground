// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeText(text: string, format: "text" | "html") {
  // For HTML we must preserve whitespace/newlines as part of structure.
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

async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
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

  return data.response?.translation ?? null;
}

async function saveCache(
  supabase: any,
  cacheKey: string,
  payload: { translation: string; sourceLanguage: string; targetLanguage: string; format: "text" | "html" },
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await supabase.from("ai_response_cache").upsert(
    {
      cache_key: cacheKey,
      function_name: "auto-translate",
      response: payload,
      request_params: { sourceLanguage: payload.sourceLanguage, targetLanguage: payload.targetLanguage, format: payload.format },
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

function getSystemPrompt(format: "text" | "html", sourceLang: string, targetLang: string): string {
  const srcName = LANG_NAMES[sourceLang] || sourceLang;
  const tgtName = LANG_NAMES[targetLang] || targetLang;

  if (format === "html") {
    return `You are a professional translation engine. Translate from ${srcName} to ${tgtName}.

CRITICAL HTML TRANSLATION RULES:
1. Output MUST be valid JSON: {"translation":"<translated HTML here>"}
2. PRESERVE ALL HTML TAGS EXACTLY - do NOT add, remove, or reorder any tags
3. ONLY translate the visible text content between tags
4. Keep ALL tag attributes (class, id, src, href, style, etc.) UNCHANGED
5. Preserve ALL whitespace, line breaks, and formatting inside the HTML
6. Keep emojis, numbers, URLs, proper nouns, and brand names AS-IS
7. Do NOT escape HTML entities that were not escaped in the original
8. Do NOT convert <br> to <br/> or vice versa - keep original format
9. Do NOT wrap output in markdown code blocks

Example input: <p>안녕하세요!</p><p>반갑습니다.</p>
Example output for Vietnamese: {"translation":"<p>Xin chào!</p><p>Rất vui được gặp bạn.</p>"}`;
  }

  return `You are a professional translation engine. Translate from ${srcName} to ${tgtName}.

RULES:
1. Output MUST be valid JSON: {"translation":"<translated text here>"}
2. Translate naturally and fluently for the target language
3. Keep emojis, numbers, URLs, proper nouns, and brand names AS-IS
4. Preserve line breaks (\\n) when present in original
5. Do NOT add markdown formatting unless it was in the original`;
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage, format } = await req.json();
    const effectiveFormat: "text" | "html" = format === "html" ? "html" : "text";

    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ translation: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sourceLanguage || !targetLanguage) {
      return new Response(JSON.stringify({ error: "sourceLanguage and targetLanguage are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sourceLanguage === targetLanguage) {
      return new Response(JSON.stringify({ translation: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalized = normalizeText(text, effectiveFormat);
    const cacheKey = `auto_translate_v2_${effectiveFormat}_${sourceLanguage}_${targetLanguage}_${await sha256Hex(normalized)}`;

    const cached = await checkCache(supabase, cacheKey);
    if (cached) {
      return new Response(JSON.stringify({ translation: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(effectiveFormat, sourceLanguage, targetLanguage);
    const userPrompt = effectiveFormat === "html"
      ? `Translate this HTML content. Remember: preserve ALL tags exactly, only translate visible text.\n\nHTML:\n${text}`
      : `Translate this text:\n\n${text}`;

    console.log(`[auto-translate] Translating from ${sourceLanguage} to ${targetLanguage}, format: ${effectiveFormat}, length: ${text.length}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "I understand. I will translate while preserving structure exactly and output valid JSON." }] },
            { role: "user", parts: [{ text: userPrompt }] },
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
      return new Response(JSON.stringify({ error: "translation_failed" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`[auto-translate] Raw response length: ${raw.length}`);

    // Extract JSON from response
    let translation = "";
    
    // Try to find JSON object in response
    const jsonMatch = raw.match(/\{[\s\S]*?"translation"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        // Clean control characters but preserve newlines in translation value
        let cleanedJson = jsonMatch[0];
        
        // Handle escaped newlines and special characters
        // First, temporarily replace valid escape sequences
        cleanedJson = cleanedJson
          .replace(/\\n/g, "<<<NEWLINE>>>")
          .replace(/\\t/g, "<<<TAB>>>")
          .replace(/\\r/g, "<<<CR>>>")
          .replace(/\\\\/g, "<<<BACKSLASH>>>");
        
        // Remove other control characters
        cleanedJson = cleanedJson.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
        
        // Restore escape sequences
        cleanedJson = cleanedJson
          .replace(/<<<NEWLINE>>>/g, "\\n")
          .replace(/<<<TAB>>>/g, "\\t")
          .replace(/<<<CR>>>/g, "\\r")
          .replace(/<<<BACKSLASH>>>/g, "\\\\");
        
        const parsed = JSON.parse(cleanedJson);
        translation = (parsed?.translation ?? "").toString();
        
        // Convert escaped newlines back to real newlines for HTML
        if (effectiveFormat === "html") {
          translation = translation.replace(/\\n/g, "\n");
        }
      } catch (parseError) {
        console.warn("[auto-translate] JSON parse failed:", parseError);
        
        // Fallback: extract translation value with regex
        const valueMatch = raw.match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (valueMatch) {
          translation = valueMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\");
        } else {
          // Last resort: strip JSON wrapper if present
          translation = raw
            .replace(/^[\s\S]*?"translation"\s*:\s*"?/, "")
            .replace(/"?\s*\}[\s\S]*$/, "")
            .trim();
        }
      }
    } else {
      // No JSON found, use raw response (strip markdown code blocks if present)
      translation = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
    }

    // Final cleanup
    translation = translation.trim();
    
    if (!translation) {
      console.error("[auto-translate] Empty translation result");
      return new Response(JSON.stringify({ error: "empty_translation", translation: text }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[auto-translate] Translation successful, length: ${translation.length}`);
    await saveCache(supabase, cacheKey, { translation, sourceLanguage, targetLanguage, format: effectiveFormat });

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
