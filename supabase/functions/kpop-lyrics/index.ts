import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const difficulty = body?.difficulty ?? null;
    const excludeIds: string[] = Array.isArray(body?.excludeIds) ? body.excludeIds : [];
    const count: number = typeof body?.count === "number" ? body.count : 5;

    console.log(`[KPop Lyrics] Request: difficulty=${difficulty ?? "all"}, excludeIds=${excludeIds.length}, count=${count}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query kpop_lyrics table
    let query = supabase
      .from("kpop_lyrics")
      .select("id, artist, song, youtube_id, timestamp, lyric_line, answer, hint, difficulty, points")
      .eq("is_active", true);

    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: lyrics, error } = await query.limit(50);

    if (error) {
      console.error("[KPop Lyrics] Query error:", error);
      throw new Error("Failed to load lyrics");
    }

    if (!lyrics || lyrics.length === 0) {
      return new Response(
        JSON.stringify({ questions: [], message: "K-POP 콘텐츠가 아직 준비되지 않았습니다." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Shuffle and pick
    const shuffled = [...lyrics].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    console.log(`[KPop Lyrics] Returning ${picked.length} questions`);

    return new Response(
      JSON.stringify({
        questions: picked.map((q) => ({
          id: q.id,
          artist: q.artist,
          song: q.song,
          youtubeId: q.youtube_id,
          timestamp: q.timestamp,
          lyricLine: q.lyric_line,
          answer: q.answer,
          hint: q.hint,
          difficulty: q.difficulty,
          points: q.points,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KPop Lyrics] Error:", error);

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
