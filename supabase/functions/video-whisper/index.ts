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

    console.log(`Processing video: ${youtubeId}`);

    // For now, we'll use a placeholder approach since direct YouTube audio extraction
    // requires additional services. In production, you would:
    // 1. Use a service like youtube-dl or yt-dlp to extract audio
    // 2. Or use a third-party API that provides audio extraction
    // 3. Then send that audio to Whisper

    // For demonstration, we'll create a mock transcription
    // In production, replace this with actual Whisper API call
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a placeholder subtitle entry
    // In production, this would be the actual Whisper transcription
    const placeholderSubtitles = [
      { start: 0, end: 5, text: "[자막 생성 중... Whisper API 연동 필요]" },
      { start: 5, end: 10, text: "[YouTube 오디오 추출 서비스 연동 후 자동 생성됩니다]" }
    ];

    // Save Korean subtitles
    const { error: subtitleError } = await supabase
      .from('video_subtitles')
      .upsert({
        video_id,
        language: 'ko',
        subtitles: placeholderSubtitles,
        is_reviewed: false
      }, {
        onConflict: 'video_id,language'
      });

    if (subtitleError) {
      console.error('Error saving subtitles:', subtitleError);
      throw subtitleError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subtitle generation initiated',
        subtitles: placeholderSubtitles,
        note: 'Production requires YouTube audio extraction service integration'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in video-whisper:', error);
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
