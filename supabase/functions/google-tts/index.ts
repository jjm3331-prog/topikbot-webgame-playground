import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini 2.5 Flash TTS voices
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

    // Select voice (default: Kore - natural Korean voice)
    const selectedVoice: GeminiVoice = VOICES.includes(voice) ? voice : "Kore";

    // Build style instruction
    let styleInstruction = prompt || "Read naturally and clearly in Korean.";
    if (speed && speed < 0.8) {
      styleInstruction = "Read slowly and clearly. " + styleInstruction;
    } else if (speed && speed > 1.2) {
      styleInstruction = "Read quickly but clearly. " + styleInstruction;
    }

    console.log(`Generating Gemini Flash TTS: voice=${selectedVoice}, text length=${truncatedText.length}`);

    // Use Gemini API directly (generativelanguage.googleapis.com)
    // This bypasses Cloud Text-to-Speech API restrictions
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `${styleInstruction}\n\n${truncatedText}` 
            }]
          }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: selectedVoice
                }
              }
            }
          }
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
    
    // Extract audio from Gemini response
    // Response format: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || "audio/wav";

    if (!audioData) {
      console.error("No audio content in Gemini response:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No audio content returned", response: JSON.stringify(data).slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 audio
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`Gemini Flash TTS generated: ${bytes.length} bytes, mimeType=${mimeType}`);

    // Determine content type (Gemini returns WAV by default)
    const contentType = mimeType.includes("wav") ? "audio/wav" : 
                        mimeType.includes("mp3") ? "audio/mpeg" : mimeType;

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
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
