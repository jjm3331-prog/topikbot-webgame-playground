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

export async function playElevenLabsTTS(
  text: string,
  opts?: { speed?: number; truncate?: number }
) {
  const cleaned = (text || "").trim();
  if (!cleaned) return;

  const truncate = opts?.truncate ?? 800;
  const speed = opts?.speed ?? 0.8;

  cleanupAudio();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: cleaned.slice(0, truncate), speed }),
    }
  );

  if (!response.ok) {
    const t = await response.text().catch(() => "");
    throw new Error(`TTS request failed: ${response.status} ${t}`);
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

export function stopElevenLabsTTS() {
  cleanupAudio();
}
