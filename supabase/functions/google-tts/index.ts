import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Korean voice options - WaveNet and Neural2 are highest quality
const KOREAN_VOICES = {
  // WaveNet voices (premium quality)
  "ko-KR-Wavenet-A": { gender: "FEMALE", type: "WaveNet" },
  "ko-KR-Wavenet-B": { gender: "FEMALE", type: "WaveNet" },
  "ko-KR-Wavenet-C": { gender: "MALE", type: "WaveNet" },
  "ko-KR-Wavenet-D": { gender: "MALE", type: "WaveNet" },
  // Neural2 voices (newest, most natural)
  "ko-KR-Neural2-A": { gender: "FEMALE", type: "Neural2" },
  "ko-KR-Neural2-B": { gender: "FEMALE", type: "Neural2" },
  "ko-KR-Neural2-C": { gender: "MALE", type: "Neural2" },
  // Standard voices (more affordable)
  "ko-KR-Standard-A": { gender: "FEMALE", type: "Standard" },
  "ko-KR-Standard-B": { gender: "FEMALE", type: "Standard" },
  "ko-KR-Standard-C": { gender: "MALE", type: "Standard" },
  "ko-KR-Standard-D": { gender: "MALE", type: "Standard" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, speed } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_CLOUD_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    if (!GOOGLE_CLOUD_API_KEY) {
      console.error("GOOGLE_CLOUD_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default to Neural2 female voice for best quality
    const selectedVoice = voice || "ko-KR-Neural2-A";
    const speakingRate = speed || 0.9; // Slightly slower for learning

    console.log(`Google TTS request: voice=${selectedVoice}, speed=${speakingRate}, text length=${text.length}`);

    const requestBody = {
      input: { text: text.slice(0, 5000) }, // Google TTS limit is 5000 chars
      voice: {
        languageCode: "ko-KR",
        name: selectedVoice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: speakingRate,
        pitch: 0, // Natural pitch
        volumeGainDb: 0,
        effectsProfileId: ["headphone-class-device"], // Optimized for headphones
      },
    };

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google TTS API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `TTS API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      console.error("No audio content in response");
      return new Response(
        JSON.stringify({ error: "No audio generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 to binary
    const binaryString = atob(data.audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`Google TTS success: generated ${bytes.length} bytes`);

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google TTS error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
