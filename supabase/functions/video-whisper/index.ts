import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Subtitle = { start: number; end: number; text: string };

// Multiple YouTube audio extraction services for reliability
const AUDIO_EXTRACTORS = [
  {
    name: "yt-download.org",
    getAudioUrl: async (videoId: string) => {
      const resp = await fetch(`https://api.yt-download.org/get-links?url=https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      // Find audio format
      const audio = data?.formats?.find((f: any) => f.mimeType?.includes("audio"));
      return audio?.url || null;
    }
  },
  {
    name: "y2mate-api",
    getAudioUrl: async (videoId: string) => {
      // Use rapidapi y2mate
      const resp = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
        headers: {
          "X-RapidAPI-Key": Deno.env.get("RAPIDAPI_KEY") || "",
          "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
          "User-Agent": "Mozilla/5.0"
        }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.link || null;
    }
  },
  {
    name: "ssyoutube",
    getAudioUrl: async (videoId: string) => {
      const resp = await fetch(`https://ssyoutube.com/api/convert?url=https://www.youtube.com/watch?v=${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const audio = data?.url?.find((u: any) => u.type === "mp3" || u.audio);
      return audio?.url || null;
    }
  },
  {
    name: "loader.to",
    getAudioUrl: async (videoId: string) => {
      // Step 1: Request conversion
      const initResp = await fetch(`https://loader.to/api/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          format: "mp3"
        })
      });
      if (!initResp.ok) return null;
      const initData = await initResp.json();
      if (!initData?.id) return null;
      
      // Step 2: Poll for result
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusResp = await fetch(`https://loader.to/api/status?id=${initData.id}`, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!statusResp.ok) continue;
        const statusData = await statusResp.json();
        if (statusData?.download_url) return statusData.download_url;
        if (statusData?.status === "error") break;
      }
      return null;
    }
  },
  {
    name: "ytdl-core-api",
    getAudioUrl: async (videoId: string) => {
      // Try public ytdl API instances
      const apis = [
        `https://ytdl-core-api.onrender.com/api/info?url=https://www.youtube.com/watch?v=${videoId}`,
        `https://yt-dlp-api.onrender.com/api/info?url=https://www.youtube.com/watch?v=${videoId}`,
      ];
      
      for (const api of apis) {
        try {
          const resp = await fetch(api, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!resp.ok) continue;
          const data = await resp.json();
          const formats = data?.formats || data?.info?.formats || [];
          const audio = formats.find((f: any) => 
            f.mimeType?.includes("audio") || f.audioCodec || f.acodec
          );
          if (audio?.url) return audio.url;
        } catch {
          continue;
        }
      }
      return null;
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const video_id = body?.video_id as string | undefined;
    const youtube_id = body?.youtube_id as string | undefined;
    const manual_subtitles = body?.manual_subtitles as string | Subtitle[] | undefined;

    if (!video_id) throw new Error("video_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Backend env missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Manual subtitles path (kept for fallback)
    if (manual_subtitles) {
      console.log(`[Whisper] Manual subtitles input for video: ${video_id}`);

      let subtitles: Subtitle[] = [];
      if (typeof manual_subtitles === "string") {
        subtitles = parseSRT(manual_subtitles);
        console.log(`[Whisper] Parsed SRT: ${subtitles.length}`);
      } else if (Array.isArray(manual_subtitles)) {
        subtitles = manual_subtitles as Subtitle[];
        console.log(`[Whisper] Using JSON array: ${subtitles.length}`);
      }

      if (!subtitles.length) throw new Error("No valid subtitles found in input");

      const { error } = await supabase
        .from("video_subtitles")
        .upsert(
          {
            video_id,
            language: "ko",
            subtitles: subtitles as unknown as any,
            is_reviewed: false,
          },
          { onConflict: "video_id,language" },
        );

      if (error) {
        console.error("[Whisper] DB save error:", error);
        throw new Error(error.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `자막 저장 완료: ${subtitles.length}개 세그먼트`,
          subtitles_count: subtitles.length,
          source: "manual",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Automatic path: Extract audio from YouTube and send to Whisper
    if (!youtube_id) {
      return new Response(
        JSON.stringify({
          error: "youtube_id is required for automatic subtitle generation",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) throw new Error("OPENAI_API_KEY is not configured");

    console.log(`[Whisper] Starting automatic extraction for YouTube: ${youtube_id}`);

    // Try each audio extractor until one succeeds
    let audioUrl: string | null = null;
    let successExtractor: string | null = null;

    for (const extractor of AUDIO_EXTRACTORS) {
      console.log(`[Whisper] Trying extractor: ${extractor.name}`);
      try {
        audioUrl = await extractor.getAudioUrl(youtube_id);
        if (audioUrl) {
          successExtractor = extractor.name;
          console.log(`[Whisper] Success with ${extractor.name}: ${audioUrl.slice(0, 100)}...`);
          break;
        }
      } catch (e) {
        console.log(`[Whisper] ${extractor.name} failed:`, e);
      }
    }

    if (!audioUrl) {
      console.error("[Whisper] All audio extractors failed");
      return new Response(
        JSON.stringify({
          error: "모든 오디오 추출 서비스가 실패했습니다. 잠시 후 다시 시도해주세요.",
          tried: AUDIO_EXTRACTORS.map(e => e.name),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Download audio
    console.log(`[Whisper] Downloading audio from ${successExtractor}...`);
    const audioResp = await fetch(audioUrl, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!audioResp.ok) {
      const t = await safeText(audioResp);
      console.error("[Whisper] Audio download failed:", audioResp.status, t);
      return new Response(
        JSON.stringify({ error: `오디오 다운로드 실패 (${audioResp.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = audioResp.headers.get("content-type") || "audio/mpeg";
    const audioBuf = await audioResp.arrayBuffer();
    
    // OpenAI Whisper file limit is ~25MB
    const MAX_BYTES = 25 * 1024 * 1024;
    if (audioBuf.byteLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `오디오 파일이 너무 큽니다 (${Math.round(audioBuf.byteLength / 1024 / 1024)}MB). 최대 25MB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[Whisper] Audio downloaded: ${Math.round(audioBuf.byteLength / 1024)}KB`);

    const filename = "audio.mp3";
    const file = new File([audioBuf], filename, { type: contentType });

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("file", file);
    form.append("response_format", "verbose_json");
    form.append("language", "ko");

    console.log(`[Whisper] Sending to OpenAI Whisper...`);

    const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
      },
      body: form,
    });

    const whisperText = await safeText(whisperResp);
    if (!whisperResp.ok) {
      console.error("[Whisper] OpenAI error:", whisperResp.status, whisperText);
      return new Response(
        JSON.stringify({ error: `Whisper API error (${whisperResp.status})`, details: whisperText.slice(0, 2000) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(whisperText);
    } catch {
      console.error("[Whisper] Whisper response not JSON:", whisperText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Whisper response parse failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const segments = Array.isArray(parsed?.segments) ? parsed.segments : [];
    if (!segments.length) {
      return new Response(
        JSON.stringify({ error: "No segments returned from Whisper" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subtitles: Subtitle[] = segments
      .map((s: any) => ({
        start: typeof s?.start === "number" ? s.start : 0,
        end: typeof s?.end === "number" ? s.end : 0,
        text: String(s?.text ?? "").trim(),
      }))
      .filter((s: Subtitle) => s.text && s.end > s.start);

    console.log(`[Whisper] Parsed segments: ${subtitles.length} / raw: ${segments.length}`);

    if (!subtitles.length) {
      return new Response(
        JSON.stringify({ error: "No valid subtitle segments after parsing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: upsertError } = await supabase
      .from("video_subtitles")
      .upsert(
        {
          video_id,
          language: "ko",
          subtitles: subtitles as unknown as any,
          is_reviewed: false,
        },
        { onConflict: "video_id,language" },
      );

    if (upsertError) {
      console.error("[Whisper] DB upsert error:", upsertError);
      throw new Error(upsertError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Whisper 자막 생성 완료: ${subtitles.length}개 세그먼트`,
        subtitles_count: subtitles.length,
        source: successExtractor,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Whisper] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function safeText(resp: Response) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

// Parse SRT format to subtitle array
function parseSRT(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const timestampLine = lines[1];
    const match = timestampLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/,
    );
    if (!match) continue;

    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const text = lines.slice(2).join(" ").trim();

    if (text) subtitles.push({ start, end, text });
  }

  return subtitles;
}

function parseTimestamp(timestamp: string): number {
  const normalized = timestamp.replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length !== 3) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parseFloat(parts[2]);
  return h * 3600 + m * 60 + s;
}
