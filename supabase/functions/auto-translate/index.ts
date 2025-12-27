// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeText(text: string) {
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

async function saveCache(supabase: any, cacheKey: string, payload: { translation: string; sourceLanguage: string; targetLanguage: string }) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);

  await supabase.from("ai_response_cache").upsert(
    {
      cache_key: cacheKey,
      function_name: "auto-translate",
      response: payload,
      request_params: { sourceLanguage: payload.sourceLanguage, targetLanguage: payload.targetLanguage },
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
    },
    { onConflict: "cache_key" },
  );
}

const SYSTEM_PROMPT = `You are a professional localization engine for a Korean learning web app.

Rules:
- Output MUST be valid JSON: {"translation":"..."}
- Translate naturally for UI/marketing/legal content.
- Keep emojis and proper nouns as-is.
- Do not add extra fields.
- Preserve line breaks when helpful.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage } = await req.json();

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

    const normalized = normalizeText(text);
    const cacheKey = `auto_translate_v1_${sourceLanguage}_${targetLanguage}_${await sha256Hex(normalized)}`;

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

    const prompt = `${SYSTEM_PROMPT}\n\nTranslate from ${sourceLanguage} to ${targetLanguage}.\n\nTEXT:\n${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
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

    // Extract JSON and clean control characters
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let translation = raw.trim();
    
    if (jsonMatch) {
      try {
        // Remove control characters that break JSON parsing (except for valid escape sequences)
        const cleanedJson = jsonMatch[0]
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove ASCII control chars
          .replace(/\\n/g, '\n') // Preserve actual newlines
          .replace(/\\t/g, '\t'); // Preserve tabs
        
        const parsed = JSON.parse(cleanedJson);
        translation = (parsed?.translation ?? raw).toString().trim();
      } catch (parseError) {
        console.warn("JSON parse failed, using raw response:", parseError);
        // Fallback: try to extract translation value manually
        const translationMatch = raw.match(/"translation"\s*:\s*"([^"]+)"/);
        if (translationMatch) {
          translation = translationMatch[1];
        } else {
          // Use raw text as translation (stripping JSON wrapper if present)
          translation = raw.replace(/^\s*\{\s*"translation"\s*:\s*"?|"?\s*\}\s*$/g, '').trim();
        }
      }
    }

    await saveCache(supabase, cacheKey, { translation, sourceLanguage, targetLanguage });

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
