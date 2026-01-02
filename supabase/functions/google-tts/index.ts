import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Cloud TTS: we accept the existing "GeminiVoice" strings from the client,
// but we map them to a real ko-KR voice dynamically.
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

    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_CLOUD_API_KEY) {
      console.error("GOOGLE_CLOUD_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate text (keep requests reasonable)
    const truncatedText = text.trim().slice(0, 2000);

    // Map the existing voice string to a gender (male/female) and pick a real ko-KR voice dynamically
    const selectedVoice: GeminiVoice = VOICES.includes(voice) ? voice : "Kore";
    const maleVoices = new Set<GeminiVoice>(["Charon", "Fenrir", "Puck", "Orus"]);
    const gender = maleVoices.has(selectedVoice) ? "MALE" : "FEMALE";

    console.log(`Generating TTS (Google Cloud): gender=${gender}, text length=${truncatedText.length}`);

    const voicesResp = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${GOOGLE_CLOUD_API_KEY}`,
      { method: "GET" }
    );

    let voiceName: string | undefined;
    if (voicesResp.ok) {
      const voicesData = await voicesResp.json();
      const voices = Array.isArray(voicesData.voices) ? voicesData.voices : [];
      const ko = voices.filter((v: any) => Array.isArray(v.languageCodes) && v.languageCodes.includes("ko-KR"));
      const byGender = ko.filter((v: any) => String(v.ssmlGender || "").toUpperCase() === gender);
      const candidates = byGender.length ? byGender : ko;
      const pick = (re: RegExp) => candidates.find((v: any) => re.test(String(v.name)));
      voiceName = (pick(/Neural2/i) || pick(/Wavenet/i) || candidates[0])?.name;
    } else {
      const t = await voicesResp.text().catch(() => "");
      console.warn("voices list failed:", voicesResp.status, t);
    }

    // speakingRate (speed): Google Cloud supports 0.25~4.0
    const speakingRate = Math.min(4.0, Math.max(0.25, Number(speed || 1.0)));

    // Call Google Cloud Text-to-Speech
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text: truncatedText },
          voice: {
            languageCode: "ko-KR",
            ...(voiceName ? { name: voiceName } : {}),
            ssmlGender: gender,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate,
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

    console.log(`TTS generated successfully: ${bytes.length} bytes`);

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
