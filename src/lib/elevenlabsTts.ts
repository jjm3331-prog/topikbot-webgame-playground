import { supabase } from "@/integrations/supabase/client";

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

  const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
    body: { text: cleaned.slice(0, truncate), speed },
  });

  if (error) throw error;

  // supabase-js returns different types depending on content-type.
  let blob: Blob | null = null;
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: "audio/mpeg" });
  } else if (data && typeof data === "object" && "audioContent" in data) {
    // If the function ever switches to base64 JSON.
    const base64 = (data as any).audioContent as string;
    const res = await fetch(`data:audio/mpeg;base64,${base64}`);
    blob = await res.blob();
  }

  if (!blob) {
    throw new Error("Unsupported TTS response format");
  }

  const url = URL.createObjectURL(blob);
  currentObjectUrl = url;

  const audio = new Audio(url);
  currentAudio = audio;

  await audio.play();

  audio.onended = () => {
    cleanupAudio();
  };
  audio.onerror = () => {
    cleanupAudio();
  };
}

export function stopElevenLabsTTS() {
  cleanupAudio();
}
