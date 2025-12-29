import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Subtitle = { start: number; end: number; text: string };

// 오디오 URL + 다운로드까지 함께 시도하는 구조
type AudioResult = { url: string; buffer: ArrayBuffer; contentType: string; source: string };

// 다운로드 시도 함수 (재시도 포함)
async function tryDownloadAudio(url: string, source: string): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Whisper] Downloading from ${source} (attempt ${attempt}/${MAX_RETRIES})...`);
      const resp = await fetch(url, {
        method: "GET",
        headers: { 
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "*/*",
          "Referer": "https://www.youtube.com/"
        },
      });
      
      if (!resp.ok) {
        console.log(`[Whisper] Download failed: ${resp.status}`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return null;
      }
      
      const contentType = resp.headers.get("content-type") || "audio/mpeg";
      const buffer = await resp.arrayBuffer();
      
      // 최소 10KB 이상이어야 유효한 오디오
      if (buffer.byteLength < 10 * 1024) {
        console.log(`[Whisper] Downloaded file too small: ${buffer.byteLength} bytes`);
        return null;
      }
      
      console.log(`[Whisper] ✓ Downloaded ${Math.round(buffer.byteLength / 1024)}KB from ${source}`);
      return { buffer, contentType };
    } catch (e) {
      console.log(`[Whisper] Download error:`, e);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  return null;
}

// Piped 인스턴스들 - 다운로드까지 시도
async function tryPipedInstances(videoId: string): Promise<AudioResult | null> {
  const instances = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.yt",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.in.projectsegfau.lt",
    "https://pipedapi.darkness.services"
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
      
      if (!resp.ok) {
        console.log(`[Whisper] Piped ${instance} returned ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      const audioStreams = data?.audioStreams || [];
      
      // Sort by bitrate, prefer higher quality
      const sorted = audioStreams
        .filter((s: any) => s.url)
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      
      // 각 오디오 URL에 대해 다운로드 시도
      for (const stream of sorted) {
        const source = `piped-${instance.split('//')[1]}`;
        const result = await tryDownloadAudio(stream.url, source);
        if (result) {
          return { url: stream.url, ...result, source };
        }
        console.log(`[Whisper] Piped URL failed, trying next stream...`);
      }
    } catch (e) {
      console.log(`[Whisper] Piped ${instance} error:`, e);
    }
  }
  return null;
}

// Invidious 인스턴스들 - 다운로드까지 시도
async function tryInvidiousInstances(videoId: string): Promise<AudioResult | null> {
  const instances = [
    "https://vid.puffyan.us",
    "https://invidious.kavin.rocks",
    "https://y.com.sb",
    "https://inv.riverside.rocks",
    "https://invidious.nerdvpn.de",
    "https://inv.tux.pizza"
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
      
      // Find audio formats (prefer higher quality)
      const audioFormats = formats
        .filter((f: any) => f.type?.includes("audio"))
        .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      
      for (const format of audioFormats) {
        if (!format.url) continue;
        const source = `invidious-${instance.split('//')[1]}`;
        const result = await tryDownloadAudio(format.url, source);
        if (result) {
          return { url: format.url, ...result, source };
        }
      }
    } catch (e) {
      console.log(`[Whisper] Invidious ${instance} error:`, e);
    }
  }
  return null;
}

// Cobalt API - 다운로드까지 시도
async function tryCobaltInstances(videoId: string): Promise<AudioResult | null> {
  const instances = [
    { url: "https://api.cobalt.tools/api/json", version: "new" },
    { url: "https://cobalt.api.timelessnesses.me/api/json", version: "new" }
  ];
  
  for (const inst of instances) {
    try {
      console.log(`[Whisper] Trying Cobalt: ${inst.url}`);
      const resp = await fetch(inst.url, {
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
        console.log(`[Whisper] Cobalt returned ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      const audioUrl = data?.url || data?.audio;
      
      if (audioUrl) {
        const source = `cobalt`;
        const result = await tryDownloadAudio(audioUrl, source);
        if (result) {
          return { url: audioUrl, ...result, source };
        }
      }
    } catch (e) {
      console.log(`[Whisper] Cobalt error:`, e);
    }
  }
  return null;
}

// 모든 추출기를 순차 시도 (URL 획득 + 다운로드까지 성공해야 반환)
async function extractAndDownloadAudio(videoId: string): Promise<AudioResult | null> {
  // 1. Piped (가장 안정적)
  console.log(`[Whisper] === Phase 1: Piped ===`);
  const pipedResult = await tryPipedInstances(videoId);
  if (pipedResult) return pipedResult;
  
  // 2. Invidious
  console.log(`[Whisper] === Phase 2: Invidious ===`);
  const invResult = await tryInvidiousInstances(videoId);
  if (invResult) return invResult;
  
  // 3. Cobalt
  console.log(`[Whisper] === Phase 3: Cobalt ===`);
  const cobaltResult = await tryCobaltInstances(videoId);
  if (cobaltResult) return cobaltResult;
  
  return null;
}

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

    // URL 획득 + 다운로드까지 성공해야 반환 (실패 시 다른 인스턴스로 자동 재시도)
    const audioResult = await extractAndDownloadAudio(youtube_id);

    if (!audioResult) {
      console.error("[Whisper] All audio extraction and download attempts failed");
      return new Response(
        JSON.stringify({
          error: "모든 오디오 추출 서비스가 실패했습니다. YouTube 영상이 비공개이거나 지역 제한이 있을 수 있습니다.",
          tried: ["piped", "invidious", "cobalt"],
          suggestion: "수동으로 SRT 파일을 업로드하거나, 다른 영상을 시도해주세요."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { buffer: audioBuf, contentType, source: successExtractor } = audioResult;

    
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
