import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubtitleItem = {
  start?: number;
  end?: number;
  text?: string;
};

function normalizeWord(raw: string) {
  return raw
    .replace(/[`*_~()[\]{}<>#|]/g, "")
    .replace(/[.,!?;:"'”“‘’]/g, "")
    .trim();
}

function pickBlankWord(text: string) {
  const words = text
    .split(/\s+/)
    .map((w) => normalizeWord(w))
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w));

  if (words.length === 0) return null;

  // Prefer longer words (more game-like)
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return sorted[Math.min(2, sorted.length - 1)];
}

function makeHint(answer: string) {
  const first = answer[0] ?? "";
  return `${first}… (${answer.length}자)`;
}

function pointsForDifficulty(difficulty: string) {
  if (difficulty === "easy") return 10;
  if (difficulty === "hard") return 25;
  return 15;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const difficulty = body?.difficulty ?? null;
    const excludeIds: string[] = Array.isArray(body?.excludeIds) ? body.excludeIds : [];
    const count: number = typeof body?.count === "number" ? body.count : 5;

    console.log(
      `[KPop MV Quiz] Request: difficulty=${difficulty ?? "all"}, excludeIds=${excludeIds.length}, count=${count}`
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get published K-Pop videos (MV/related) and their subtitles
    const { data: videos, error: videosError } = await supabase
      .from("video_lessons")
      .select("id,title,youtube_id,difficulty")
      .eq("is_published", true)
      .eq("category", "kpop")
      .order("created_at", { ascending: false })
      .limit(50);

    if (videosError) {
      console.error("[KPop MV Quiz] video_lessons error:", videosError);
      throw new Error("Failed to load videos");
    }

    const videoIds = (videos ?? []).map((v) => v.id);
    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({ questions: [], message: "K-POP 콘텐츠가 아직 준비되지 않았습니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subtitleRows, error: subsError } = await supabase
      .from("video_subtitles")
      .select("video_id,subtitles")
      .in("video_id", videoIds)
      .eq("language", "ko")
      .limit(200);

    if (subsError) {
      console.error("[KPop MV Quiz] video_subtitles error:", subsError);
      throw new Error("Failed to load subtitles");
    }

    const videoById = new Map<string, { title: string; youtube_id: string; difficulty: string }>();
    for (const v of videos ?? []) {
      videoById.set(v.id, {
        title: v.title,
        youtube_id: v.youtube_id,
        difficulty: v.difficulty,
      });
    }

    const candidates: Array<{
      id: string;
      youtubeId: string;
      timestamp: number;
      textWithBlank: string;
      answer: string;
      hint: string;
      difficulty: string;
      points: number;
      artist: string;
      song: string;
    }> = [];

    for (const row of subtitleRows ?? []) {
      const meta = videoById.get(row.video_id);
      if (!meta) continue;

      // Optional difficulty filter (use the video's difficulty as the filter key)
      const effectiveDifficulty = meta.difficulty || "medium";
      if (difficulty && effectiveDifficulty !== difficulty) continue;

      const subs = Array.isArray(row.subtitles) ? (row.subtitles as SubtitleItem[]) : [];

      subs.forEach((s, idx) => {
        const rawText = typeof s?.text === "string" ? s.text : "";
        const text = rawText.replace(/\s+/g, " ").trim();
        if (text.length < 8) return;

        const blankWord = pickBlankWord(text);
        if (!blankWord) return;

        const id = `${row.video_id}:${idx}:${blankWord}`;
        if (excludeIds.includes(id)) return;

        const textWithBlank = text.replace(blankWord, "____");

        // Best-effort: parse "ARTIST - SONG" titles if present
        const title = meta.title ?? "";
        const parts = title.split("-").map((p) => p.trim()).filter(Boolean);
        const artist = parts.length >= 2 ? parts[0] : "K-POP";
        const song = parts.length >= 2 ? parts.slice(1).join(" - ") : title;

        candidates.push({
          id,
          youtubeId: meta.youtube_id,
          timestamp: Math.max(0, Math.floor(Number(s?.start ?? 0))),
          textWithBlank,
          answer: blankWord,
          hint: makeHint(blankWord),
          difficulty: effectiveDifficulty,
          points: pointsForDifficulty(effectiveDifficulty),
          artist,
          song,
        });
      });
    }

    // Shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const picked = candidates.slice(0, count);

    console.log(`[KPop MV Quiz] Returning ${picked.length} questions (candidates=${candidates.length})`);

    return new Response(
      JSON.stringify({
        questions: picked.map((q) => ({
          id: q.id,
          artist: q.artist,
          song: q.song,
          youtubeId: q.youtubeId,
          timestamp: q.timestamp,
          lyricLine: q.textWithBlank,
          answer: q.answer,
          hint: q.hint,
          difficulty: q.difficulty,
          points: q.points,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KPop MV Quiz] Error:", error);

    return new Response(
      JSON.stringify({
        questions: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
