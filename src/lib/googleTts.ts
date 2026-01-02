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

export type GoogleTTSVoice = 
  | "ko-KR-Neural2-A" // Female (recommended)
  | "ko-KR-Neural2-B" // Female
  | "ko-KR-Neural2-C" // Male
  | "ko-KR-Wavenet-A" // Female
  | "ko-KR-Wavenet-B" // Female
  | "ko-KR-Wavenet-C" // Male
  | "ko-KR-Wavenet-D" // Male
  | "ko-KR-Standard-A" // Female (cheaper)
  | "ko-KR-Standard-B" // Female
  | "ko-KR-Standard-C" // Male
  | "ko-KR-Standard-D"; // Male

export interface GoogleTTSOptions {
  voice?: GoogleTTSVoice;
  speed?: number; // 0.25 to 4.0, default 0.9
  truncate?: number;
}

export async function playGoogleTTS(
  text: string,
  opts?: GoogleTTSOptions
): Promise<void> {
  const cleaned = (text || "").trim();
  if (!cleaned) return;

  const truncate = opts?.truncate ?? 800;
  const speed = opts?.speed ?? 0.9;
  const voice = opts?.voice ?? "ko-KR-Neural2-A";

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
        voice 
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
