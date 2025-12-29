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
    name: "cobalt-api",
    getAudioUrl: async (videoId: string) => {
      // Cobalt is one of the most reliable YouTube downloaders
      const cobaltInstances = [
        "https://api.cobalt.tools",
        "https://co.wuk.sh",
      ];
      
      for (const instance of cobaltInstances) {
        try {
          console.log(`[Whisper] Trying Cobalt instance: ${instance}`);
          const resp = await fetch(`${instance}/api/json`, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: JSON.stringify({
              url: `https://www.youtube.com/watch?v=${videoId}`,
              isAudioOnly: true,
              aFormat: "mp3",
              filenamePattern: "basic"
            })
          });
          
          if (!resp.ok) {
            console.log(`[Whisper] Cobalt ${instance} returned ${resp.status}`);
            continue;
          }
          
          const data = await resp.json();
          console.log(`[Whisper] Cobalt response:`, JSON.stringify(data).slice(0, 200));
          
          if (data?.url) return data.url;
          if (data?.audio) return data.audio;
        } catch (e) {
          console.log(`[Whisper] Cobalt ${instance} error:`, e);
        }
      }
      return null;
    }
  },
  {
    name: "invidious-api",
    getAudioUrl: async (videoId: string) => {
      // Invidious instances provide direct audio URLs
      const instances = [
        "https://invidious.snopyta.org",
        "https://vid.puffyan.us",
        "https://invidious.kavin.rocks",
        "https://y.com.sb",
        "https://inv.riverside.rocks"
      ];
      
      for (const instance of instances) {
        try {
          console.log(`[Whisper] Trying Invidious: ${instance}`);
          const resp = await fetch(`${instance}/api/v1/videos/${videoId}`, {
            headers: { 
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });
          
          if (!resp.ok) continue;
          
          const data = await resp.json();
          const formats = data?.adaptiveFormats || [];
          
          // Find audio format (prefer higher quality)
          const audioFormats = formats
            .filter((f: any) => f.type?.includes("audio"))
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          
          if (audioFormats.length > 0 && audioFormats[0].url) {
            console.log(`[Whisper] Found audio from ${instance}`);
            return audioFormats[0].url;
          }
        } catch (e) {
          console.log(`[Whisper] Invidious ${instance} error:`, e);
        }
      }
      return null;
    }
  },
  {
    name: "piped-api",
    getAudioUrl: async (videoId: string) => {
      // Piped is another privacy-focused YouTube frontend with API
      const instances = [
        "https://pipedapi.kavin.rocks",
        "https://api.piped.yt",
        "https://pipedapi.adminforge.de"
      ];
      
      for (const instance of instances) {
        try {
          console.log(`[Whisper] Trying Piped: ${instance}`);
          const resp = await fetch(`${instance}/streams/${videoId}`, {
            headers: { 
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/json"
            }
          });
          
          if (!resp.ok) continue;
          
          const data = await resp.json();
          const audioStreams = data?.audioStreams || [];
          
          // Sort by bitrate, prefer higher quality
          const sorted = audioStreams
            .filter((s: any) => s.url)
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          
          if (sorted.length > 0) {
            console.log(`[Whisper] Found audio from Piped ${instance}`);
            return sorted[0].url;
          }
        } catch (e) {
          console.log(`[Whisper] Piped ${instance} error:`, e);
        }
      }
      return null;
    }
  },
  {
    name: "ytdl-org-api",
    getAudioUrl: async (videoId: string) => {
      // Try public yt-dlp API wrappers
      const apis = [
        `https://ytdlp-api.fly.dev/api/info?url=https://www.youtube.com/watch?v=${videoId}`,
        `https://yt-dlp.fly.dev/api/info?url=https://www.youtube.com/watch?v=${videoId}`,
      ];
      
      for (const api of apis) {
        try {
          console.log(`[Whisper] Trying yt-dlp API: ${api.split('/api')[0]}`);
          const resp = await fetch(api, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (!resp.ok) continue;
          
          const data = await resp.json();
          const formats = data?.formats || [];
          const audio = formats.find((f: any) => 
            f.acodec && f.acodec !== "none" && !f.vcodec
          );
          if (audio?.url) {
            console.log(`[Whisper] Found audio from yt-dlp API`);
            return audio.url;
          }
        } catch (e) {
          console.log(`[Whisper] yt-dlp API error:`, e);
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
      console.log(`[Whisper] === Trying extractor: ${extractor.name} ===`);
      try {
        audioUrl = await extractor.getAudioUrl(youtube_id);
        if (audioUrl) {
          successExtractor = extractor.name;
          console.log(`[Whisper] ✓ Success with ${extractor.name}`);
          break;
        } else {
          console.log(`[Whisper] ✗ ${extractor.name} returned no URL`);
        }
      } catch (e) {
        console.log(`[Whisper] ✗ ${extractor.name} threw error:`, e);
      }
    }

    if (!audioUrl) {
      console.error("[Whisper] All audio extractors failed");
      return new Response(
        JSON.stringify({
          error: "모든 오디오 추출 서비스가 실패했습니다. YouTube 영상이 비공개이거나 지역 제한이 있을 수 있습니다.",
          tried: AUDIO_EXTRACTORS.map(e => e.name),
          suggestion: "수동으로 SRT 파일을 업로드하거나, 다른 영상을 시도해주세요."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Download audio
    console.log(`[Whisper] Downloading audio from ${successExtractor}...`);
    const audioResp = await fetch(audioUrl, {
      method: "GET",
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*"
      },
    });

    if (!audioResp.ok) {
      const t = await safeText(audioResp);
      console.error("[Whisper] Audio download failed:", audioResp.status, t.slice(0, 500));
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

    console.log(`[Whisper] Audio downloaded: ${Math.round(audioBuf.byteLength / 1024)}KB, type: ${contentType}`);

    // Determine file extension based on content type
    let ext = "mp3";
    if (contentType.includes("webm")) ext = "webm";
    else if (contentType.includes("opus")) ext = "opus";
    else if (contentType.includes("m4a")) ext = "m4a";
    else if (contentType.includes("aac")) ext = "aac";

    const filename = `audio.${ext}`;
    const file = new File([audioBuf], filename, { type: contentType });

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("file", file);
    form.append("response_format", "verbose_json");
    form.append("language", "ko");

    console.log(`[Whisper] Sending ${filename} to OpenAI Whisper...`);

    const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
      },
      body: form,
    });

    const whisperText = await safeText(whisperResp);
    if (!whisperResp.ok) {
      console.error("[Whisper] OpenAI error:", whisperResp.status, whisperText.slice(0, 1000));
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

    console.log(`[Whisper] ✓ Complete! Saved ${subtitles.length} subtitles via ${successExtractor}`);

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
