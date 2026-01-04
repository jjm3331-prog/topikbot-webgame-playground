// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_LANGUAGES = ["vi", "en", "ja", "zh", "ru", "uz"];

const LANG_NAMES: Record<string, string> = {
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  ru: "Russian",
  uz: "Uzbek",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(
        JSON.stringify({ vi: "", en: "", ja: "", zh: "", ru: "", uz: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`[translate-all-languages] Translating ${text.length} chars to 6 languages`);

    const systemPrompt = `You are a professional translation engine. Translate the given Korean text to ALL of these languages:
- Vietnamese (vi)
- English (en)
- Japanese (ja)
- Chinese Simplified (zh)
- Russian (ru)
- Uzbek (uz)

CRITICAL RULES:
1. Output MUST be valid JSON with EXACTLY this structure:
{
  "vi": "Vietnamese translation",
  "en": "English translation",
  "ja": "Japanese translation",
  "zh": "Chinese translation",
  "ru": "Russian translation",
  "uz": "Uzbek translation"
}
2. Preserve formatting (line breaks, bullet points, etc.)
3. Do NOT include the original Korean text
4. Do NOT wrap in markdown code blocks
5. All 6 language keys MUST be present in output`;

    const userPrompt = `Translate this Korean text to all 6 languages:\n\n${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "OK, I will translate to all 6 languages and return valid JSON." }] },
            { role: "user", parts: [{ text: userPrompt }] },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", rawText.slice(0, 500));
      throw new Error("Invalid response format");
    }

    let translations: Record<string, string>;
    try {
      // Clean and parse
      let cleaned = jsonMatch[0]
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      
      translations = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, rawText.slice(0, 500));
      throw new Error("Failed to parse translation response");
    }

    // Validate all languages present
    const result: Record<string, string> = {};
    for (const lang of TARGET_LANGUAGES) {
      result[lang] = translations[lang] || "";
    }

    console.log(`[translate-all-languages] Success:`, {
      vi: result.vi?.length || 0,
      en: result.en?.length || 0,
      ja: result.ja?.length || 0,
      zh: result.zh?.length || 0,
      ru: result.ru?.length || 0,
      uz: result.uz?.length || 0,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        vi: "", en: "", ja: "", zh: "", ru: "", uz: "" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
