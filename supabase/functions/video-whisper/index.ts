import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Subtitle = { start: number; end: number; text: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const video_id = body?.video_id as string | undefined;
    const audio_url = body?.audio_url as string | undefined;
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

    // 2) Automatic path: audio_url must be a direct downloadable audio file (mp3/m4a/wav)
    if (!audio_url) {
      return new Response(
        JSON.stringify({
          error: "audio_url is required (직접 다운로드 가능한 오디오 파일 URL 필요: mp3/m4a/wav)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) throw new Error("OPENAI_API_KEY is not configured");

    console.log(`[Whisper] Fetching audio from audio_url for video: ${video_id}`);

    const audioResp = await fetch(audio_url, {
      method: "GET",
      headers: {
        // Some CDNs require UA
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!audioResp.ok) {
      const t = await safeText(audioResp);
      console.error("[Whisper] Audio fetch failed:", audioResp.status, t);
      return new Response(
        JSON.stringify({ error: `audio_url fetch failed (${audioResp.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = audioResp.headers.get("content-type") || "application/octet-stream";
    const contentLength = parseInt(audioResp.headers.get("content-length") || "0", 10);

    // OpenAI Whisper file limit is ~25MB; keep a strict guard.
    const MAX_BYTES = 25 * 1024 * 1024;
    if (contentLength && contentLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `audio file too large (${Math.round(contentLength / 1024 / 1024)}MB). 최대 25MB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const audioBuf = await audioResp.arrayBuffer();
    if (audioBuf.byteLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `audio file too large (${Math.round(audioBuf.byteLength / 1024 / 1024)}MB). 최대 25MB.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const filename = guessFileName(audio_url, contentType);
    const file = new File([audioBuf], filename, { type: contentType });

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("file", file);
    form.append("response_format", "verbose_json");
    form.append("language", "ko");
    // word timestamps are included in verbose_json on many outputs; segment timestamps always exist.

    console.log(`[Whisper] Sending to OpenAI Whisper: ${filename} (${Math.round(audioBuf.byteLength / 1024)}KB)`);

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
        source: "audio_url",
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

function guessFileName(url: string, contentType: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop() || "audio";
    if (last.includes(".")) return last;
  } catch {
    // ignore
  }
  const ext = contentType.includes("mpeg") ? "mp3" : contentType.includes("mp4") ? "m4a" : contentType.includes("wav") ? "wav" : "bin";
  return `audio.${ext}`;
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
