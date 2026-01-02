let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

function cleanupAudio() {
  try {
    currentAudio?.pause();
  } catch {
    // ignore
  }
  currentAudio = null;

  if (currentObjectUrl) {
    try {
      URL.revokeObjectURL(currentObjectUrl);
    } catch {
      // ignore
    }
    currentObjectUrl = null;
  }
}

// Gemini Flash TTS voices
export type GeminiVoice = 
  | "Kore"      // Female (recommended for Korean)
  | "Aoede"     // Female
  | "Zephyr"    // Female
  | "Leda"      // Female
  | "Gacrux"    // Female
  | "Sulafat"   // Female
  | "Charon"    // Male
  | "Fenrir"    // Male
  | "Puck"      // Male
  | "Orus"      // Male
  | "Achernar"; // Female

export interface GoogleTTSOptions {
  voice?: GeminiVoice;
  speed?: number; // affects prompt style
  truncate?: number;
  prompt?: string; // style prompt for Gemini TTS
}

export async function playGoogleTTS(
  text: string,
  opts?: GoogleTTSOptions
): Promise<void> {
  const cleaned = (text || "").trim();
  if (!cleaned) return;

  const truncate = opts?.truncate ?? 2000;
  const speed = opts?.speed ?? 1.0;
  const voice = opts?.voice ?? "Kore";
  const prompt = opts?.prompt ?? "Read naturally and clearly in Korean.";

  cleanupAudio();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        text: cleaned.slice(0, truncate), 
        speed,
        voice,
        prompt,
      }),
    }
  );

  if (!response.ok) {
    const t = await response.text().catch(() => "");
    throw new Error(`Google TTS request failed: ${response.status} ${t}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  currentObjectUrl = url;

  const audio = new Audio(url);
  currentAudio = audio;

  await audio.play();

  audio.onended = () => cleanupAudio();
  audio.onerror = () => cleanupAudio();
}

export function stopGoogleTTS() {
  cleanupAudio();
}
