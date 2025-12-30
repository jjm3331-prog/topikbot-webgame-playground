import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 한국어 네이티브 보이스 (ElevenLabs Voice Library)
// ============================================
// 사용자 지정 최고 품질 한국어 네이티브 보이스

// 여성 목소리 - 사용자 지정
const VOICE_FEMALE = "ksaI0TCD9BstzEzlxj4q";
// 남성 목소리 - 사용자 지정
const VOICE_MALE = "WqVy7827vjE2r3jWvbnP";

// 기본 보이스: 여성 (사용자 지정)
const DEFAULT_KOREAN_VOICE = VOICE_FEMALE;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, speed = 0.85, gender } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!text) {
      throw new Error("Text is required");
    }

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // 성별에 따른 보이스 선택 또는 지정된 voiceId 사용
    let selectedVoice = voiceId || DEFAULT_KOREAN_VOICE;
    if (!voiceId && gender) {
      selectedVoice = gender === 'male' ? VOICE_MALE : VOICE_FEMALE;
    }

    console.log(`[TTS] Korean Native: text="${text.substring(0, 30)}..." voice=${selectedVoice} speed=${speed}`);

    // eleven_v3: 최신 최고 품질 모델 (2025년 8월 출시)
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
          model_id: "eleven_v3", // 최신 V3 모델
          output_format: "mp3_44100_128",
          // eleven_v3 stability 값: 0.0 (Creative), 0.5 (Natural), 1.0 (Robust) 중 하나만 허용
          voice_settings: {
            stability: 1.0, // Robust - 명확한 발음
            similarity_boost: 0.9,
            style: 0.2,
            use_speaker_boost: true,
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
    console.log(`[TTS] Success: ${audioBuffer.byteLength} bytes`);

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
