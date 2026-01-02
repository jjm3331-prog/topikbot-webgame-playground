import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini 2.5 Flash TTS voices (Korean optimized)
const VOICES = [
  "Kore", "Aoede", "Charon", "Fenrir", "Puck", "Zephyr",
  "Leda", "Orus", "Achernar", "Gacrux", "Sulafat"
] as const;

type GeminiVoice = typeof VOICES[number];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, speed, prompt } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate text (Gemini TTS limit)
    const truncatedText = text.trim().slice(0, 5000);

    // Select voice (default: Kore - female, natural for Korean)
    const selectedVoice: GeminiVoice = VOICES.includes(voice) ? voice : "Kore";

    // Build style prompt
    let stylePrompt = prompt || "Read naturally and clearly in Korean.";
    if (speed && speed < 0.8) {
      stylePrompt = "Read slowly and clearly. " + stylePrompt;
    } else if (speed && speed > 1.2) {
      stylePrompt = "Read quickly but clearly. " + stylePrompt;
    }

    console.log(`Generating Gemini TTS: voice=${selectedVoice}, text length=${truncatedText.length}`);

    // Call Gemini 2.5 Flash TTS via Cloud Text-to-Speech API
    // Uses modelName parameter for Gemini TTS model
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text: truncatedText,
            ...(stylePrompt ? { prompt: stylePrompt } : {}),
          },
          voice: {
            languageCode: "ko-KR",
            name: selectedVoice,
            modelName: "gemini-2.5-flash-tts",
          },
          audioConfig: {
            audioEncoding: "MP3",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini TTS API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "TTS generation failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      console.error("No audio content in response:", data);
      return new Response(
        JSON.stringify({ error: "No audio content returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 and return as audio
    const binaryString = atob(audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`Gemini TTS generated: ${bytes.length} bytes`);

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("TTS error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
