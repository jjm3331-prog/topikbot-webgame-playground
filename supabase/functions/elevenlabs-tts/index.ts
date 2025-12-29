import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Korean Native Voices (High Quality)
// Seoyeon - 한국어 네이티브 여성, 자연스럽고 명확한 발음
const KOREAN_VOICE_FEMALE = "yoZ06aMxZJJ28mfd3POQ";
// Junwoo - 한국어 네이티브 남성, 자연스럽고 명확한 발음  
const KOREAN_VOICE_MALE = "ODq5zmih8GrVes37Dizd";
// Default to female voice
const DEFAULT_KOREAN_VOICE = KOREAN_VOICE_FEMALE;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, speed = 0.8 } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!text) {
      throw new Error("Text is required");
    }

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const selectedVoice = voiceId || DEFAULT_KOREAN_VOICE;

    console.log(`[TTS] text="${text.substring(0, 50)}..." voice=${selectedVoice} speed=${speed}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          // eleven_turbo_v2_5: Fastest, supports 32 languages including Korean
          model_id: "eleven_turbo_v2_5",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true,
            speed: speed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS] Success, size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TTS] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
