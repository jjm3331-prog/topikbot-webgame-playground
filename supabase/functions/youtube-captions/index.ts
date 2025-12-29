import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Subtitle = { start: number; end: number; text: string };

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name?: { simpleText?: string };
  kind?: string;
}

/**
 * Extracts captions from YouTube video using multiple methods:
 * 1. YouTube's built-in auto-generated captions (free)
 * 2. Falls back to Whisper if no captions available
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const video_id = body?.video_id as string | undefined;
    const youtube_id = body?.youtube_id as string | undefined;
    const check_only = body?.check_only as boolean | undefined;
    const force_whisper = body?.force_whisper as boolean | undefined;

    if (!video_id || !youtube_id) {
      return new Response(
        JSON.stringify({ error: "video_id and youtube_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[YT-Captions] Processing video: ${youtube_id}, check_only: ${check_only}`);

    // Step 1: Check if YouTube has auto-generated captions
    const captionInfo = await fetchYouTubeCaptionInfo(youtube_id);
    
    // If check_only, just return the availability status
    if (check_only) {
      return new Response(
        JSON.stringify({
          has_captions: captionInfo.hasCaptions,
          available_languages: captionInfo.availableLanguages,
          has_korean: captionInfo.hasKorean,
          caption_type: captionInfo.captionType,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Backend env missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 2: If force_whisper or no captions available, return info for Whisper fallback
    if (force_whisper || !captionInfo.hasCaptions) {
      console.log(`[YT-Captions] No captions available, suggesting Whisper fallback`);
      return new Response(
        JSON.stringify({
          success: false,
          has_captions: false,
          message: "자동 자막이 없습니다. Whisper로 생성해주세요.",
          use_whisper: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Fetch the actual captions
    console.log(`[YT-Captions] Fetching captions from YouTube...`);
    const subtitles = await fetchYouTubeCaptions(captionInfo.koreanCaptionUrl || captionInfo.captionUrls[0]);

    if (!subtitles || subtitles.length === 0) {
      console.log(`[YT-Captions] Failed to parse captions, suggesting Whisper`);
      return new Response(
        JSON.stringify({
          success: false,
          has_captions: false,
          message: "자막 파싱 실패. Whisper로 생성해주세요.",
          use_whisper: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[YT-Captions] Parsed ${subtitles.length} subtitle segments`);

    // Step 4: Save to database
    const { error: upsertError } = await supabase
      .from("video_subtitles")
      .upsert(
        {
          video_id,
          language: "ko",
          subtitles: subtitles as unknown as any,
          is_reviewed: false,
        },
        { onConflict: "video_id,language" }
      );

    if (upsertError) {
      console.error("[YT-Captions] DB upsert error:", upsertError);
      throw new Error(upsertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `유튜브 자막 가져오기 완료: ${subtitles.length}개 세그먼트`,
        subtitles_count: subtitles.length,
        source: "youtube_auto",
        caption_type: captionInfo.captionType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[YT-Captions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Fetch caption metadata from YouTube page
 */
async function fetchYouTubeCaptionInfo(videoId: string): Promise<{
  hasCaptions: boolean;
  availableLanguages: string[];
  hasKorean: boolean;
  koreanCaptionUrl: string | null;
  captionUrls: string[];
  captionType: string | null;
}> {
  try {
    // Fetch YouTube video page
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });

    if (!pageResp.ok) {
      console.log(`[YT-Captions] Failed to fetch YouTube page: ${pageResp.status}`);
      return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
    }

    const html = await pageResp.text();

    // Extract player response JSON
    const playerMatch = html.match(/"captions":\s*({.*?"captionTracks":\s*\[.*?\].*?})/s);
    if (!playerMatch) {
      // Try alternative pattern
      const altMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
      if (!altMatch) {
        console.log(`[YT-Captions] No player response found`);
        return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
      }

      try {
        const playerResponse = JSON.parse(altMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks as CaptionTrack[] | undefined;
        
        if (!captionTracks || captionTracks.length === 0) {
          console.log(`[YT-Captions] No caption tracks in player response`);
          return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
        }

        const availableLanguages = captionTracks.map((t) => t.languageCode);
        const koreanTrack = captionTracks.find((t) => t.languageCode === "ko");
        const captionType = captionTracks[0]?.kind === "asr" ? "auto_generated" : "manual";

        return {
          hasCaptions: true,
          availableLanguages,
          hasKorean: !!koreanTrack,
          koreanCaptionUrl: koreanTrack?.baseUrl || null,
          captionUrls: captionTracks.map((t) => t.baseUrl),
          captionType,
        };
      } catch (e) {
        console.error(`[YT-Captions] Failed to parse player response:`, e);
        return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
      }
    }

    // Parse caption tracks from the matched JSON
    try {
      const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
      if (!captionsMatch) {
        return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
      }

      // Clean up the JSON string
      const cleanedJson = captionsMatch[1]
        .replace(/\\u0026/g, "&")
        .replace(/\\"/g, '"');
      
      const captionTracks = JSON.parse(cleanedJson) as CaptionTrack[];
      
      const availableLanguages = captionTracks.map((t) => t.languageCode);
      const koreanTrack = captionTracks.find((t) => t.languageCode === "ko");
      const captionType = captionTracks[0]?.kind === "asr" ? "auto_generated" : "manual";

      return {
        hasCaptions: true,
        availableLanguages,
        hasKorean: !!koreanTrack,
        koreanCaptionUrl: koreanTrack?.baseUrl?.replace(/\\u0026/g, "&") || null,
        captionUrls: captionTracks.map((t) => t.baseUrl.replace(/\\u0026/g, "&")),
        captionType,
      };
    } catch (e) {
      console.error(`[YT-Captions] Failed to parse caption tracks:`, e);
      return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
    }
  } catch (error) {
    console.error(`[YT-Captions] Error fetching caption info:`, error);
    return { hasCaptions: false, availableLanguages: [], hasKorean: false, koreanCaptionUrl: null, captionUrls: [], captionType: null };
  }
}

/**
 * Fetch and parse captions from YouTube's caption URL
 */
async function fetchYouTubeCaptions(captionUrl: string): Promise<Subtitle[]> {
  try {
    // Add format parameter for JSON3 output
    const url = new URL(captionUrl);
    url.searchParams.set("fmt", "json3");

    const resp = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) {
      console.log(`[YT-Captions] Failed to fetch captions: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const events = data?.events as Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> | undefined;

    if (!events || events.length === 0) {
      console.log(`[YT-Captions] No events in caption response`);
      return [];
    }

    const subtitles: Subtitle[] = [];

    for (const event of events) {
      if (!event.segs || !event.tStartMs) continue;

      const text = event.segs
        .map((seg) => seg.utf8 || "")
        .join("")
        .trim();

      if (!text || text === "\n") continue;

      const start = event.tStartMs / 1000;
      const duration = (event.dDurationMs || 3000) / 1000;
      const end = start + duration;

      subtitles.push({ start, end, text });
    }

    return subtitles;
  } catch (error) {
    console.error(`[YT-Captions] Error fetching captions:`, error);
    return [];
  }
}
