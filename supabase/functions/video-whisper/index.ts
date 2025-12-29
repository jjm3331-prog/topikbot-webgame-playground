import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtube_url, video_id } = await req.json();
    
    if (!youtube_url || !video_id) {
      throw new Error('youtube_url and video_id are required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Extract YouTube video ID
    const youtubeId = extractYouTubeId(youtube_url);
    if (!youtubeId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`[Whisper] Processing video: ${youtubeId}`);

    // Step 1: Extract audio from YouTube using cobalt.tools API
    console.log(`[Whisper] Extracting audio from YouTube...`);
    const audioUrl = await extractYouTubeAudio(youtubeId);
    
    if (!audioUrl) {
      throw new Error('Failed to extract audio from YouTube');
    }
    console.log(`[Whisper] Audio URL obtained successfully`);

    // Step 2: Download audio file
    console.log(`[Whisper] Downloading audio...`);
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    const audioBlob = await audioResponse.blob();
    console.log(`[Whisper] Audio downloaded: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB`);

    // Check file size (Whisper API limit is 25MB)
    if (audioBlob.size > 25 * 1024 * 1024) {
      throw new Error('Audio file too large (max 25MB). Try a shorter video.');
    }

    // Step 3: Send to OpenAI Whisper API with timestamps
    console.log(`[Whisper] Sending to Whisper API...`);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // Korean
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`[Whisper] API error: ${errorText}`);
      throw new Error(`Whisper API error: ${whisperResponse.status}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log(`[Whisper] Transcription received: ${whisperResult.segments?.length || 0} segments`);

    // Step 4: Convert Whisper segments to subtitle format
    const subtitles = whisperResult.segments?.map((segment: any) => ({
      start: Math.round(segment.start * 100) / 100,
      end: Math.round(segment.end * 100) / 100,
      text: segment.text.trim()
    })) || [];

    if (subtitles.length === 0) {
      // Fallback: create single subtitle from full text
      subtitles.push({
        start: 0,
        end: whisperResult.duration || 60,
        text: whisperResult.text || '[음성이 감지되지 않았습니다]'
      });
    }

    console.log(`[Whisper] Created ${subtitles.length} subtitle entries`);

    // Step 5: Save Korean subtitles to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: subtitleError } = await supabase
      .from('video_subtitles')
      .upsert({
        video_id,
        language: 'ko',
        subtitles: subtitles,
        is_reviewed: false
      }, {
        onConflict: 'video_id,language'
      });

    if (subtitleError) {
      console.error('[Whisper] Error saving subtitles:', subtitleError);
      throw subtitleError;
    }

    console.log(`[Whisper] Subtitles saved successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `자막 생성 완료: ${subtitles.length}개 세그먼트`,
        subtitles_count: subtitles.length,
        duration: whisperResult.duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Whisper] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function extractYouTubeAudio(videoId: string): Promise<string | null> {
  try {
    // Try cobalt.tools API first (free, no API key needed)
    console.log(`[Whisper] Trying cobalt.tools API...`);
    
    const cobaltResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        isAudioOnly: true,
        filenamePattern: 'basic',
      }),
    });

    if (cobaltResponse.ok) {
      const cobaltData = await cobaltResponse.json();
      console.log(`[Whisper] Cobalt response:`, cobaltData.status);
      
      if (cobaltData.status === 'stream' || cobaltData.status === 'redirect') {
        return cobaltData.url;
      }
      if (cobaltData.status === 'picker' && cobaltData.audio) {
        return cobaltData.audio;
      }
    }

    // Fallback: Try alternative cobalt instance
    console.log(`[Whisper] Trying alternative cobalt instance...`);
    const altResponse = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        aFormat: 'mp3',
      }),
    });

    if (altResponse.ok) {
      const altData = await altResponse.json();
      if (altData.url) {
        return altData.url;
      }
    }

    // Last fallback: Try ytdl-core proxy
    console.log(`[Whisper] Trying ytdl proxy...`);
    const proxyResponse = await fetch(`https://yt-api.fly.dev/audio/${videoId}`);
    if (proxyResponse.ok) {
      const proxyData = await proxyResponse.json();
      if (proxyData.url) {
        return proxyData.url;
      }
    }

    throw new Error('All audio extraction methods failed');
  } catch (error) {
    console.error('[Whisper] Audio extraction error:', error);
    throw error;
  }
}
