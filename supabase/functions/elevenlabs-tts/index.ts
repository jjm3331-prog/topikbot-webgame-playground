import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 한국어 네이티브 보이스 (ElevenLabs Voice Library)
// ============================================
// 최고 품질 한국어 네이티브 발음을 위해 선별된 보이스

// Seoyeon (서연) - 한국어 네이티브 여성, 또렷하고 따뜻한 목소리
const VOICE_SEOYEON = "yoZ06aMxZJJ28mfd3POQ";
// Junwoo (준우) - 한국어 네이티브 남성, 차분하고 명확한 발음
const VOICE_JUNWOO = "ODq5zmih8GrVes37Dizd";
// Yuna (유나) - 한국어 네이티브 여성, 젊고 밝은 톤
const VOICE_YUNA = "XB0fDUnXU5powFXDhCwa";
// Jinho (진호) - 한국어 네이티브 남성, 깊고 안정적인 목소리
const VOICE_JINHO = "AZnzlk1XvdvUeBnXmlld";

// 기본 보이스: Seoyeon (가장 자연스러운 한국어 발음)
const DEFAULT_KOREAN_VOICE = VOICE_SEOYEON;

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
      selectedVoice = gender === 'male' ? VOICE_JUNWOO : VOICE_SEOYEON;
    }

    console.log(`[TTS] Korean Native: text="${text.substring(0, 30)}..." voice=${selectedVoice} speed=${speed}`);

    // eleven_multilingual_v2: 최고 품질 다국어 모델 (한국어 발음 최적화)
    // turbo_v2_5는 빠르지만 한국어 발음 품질이 떨어짐
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
          model_id: "eleven_multilingual_v2", // 한국어 최적화 모델
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.7,         // 안정성 (높을수록 일관된 발음)
            similarity_boost: 0.9,  // 원본 보이스 유사도
            style: 0.2,             // 스타일 강도 (낮을수록 자연스러움)
            use_speaker_boost: true, // 선명도 향상
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
