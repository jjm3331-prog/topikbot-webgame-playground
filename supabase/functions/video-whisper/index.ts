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
    const { video_id, manual_subtitles } = await req.json();
    
    if (!video_id) {
      throw new Error('video_id is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If manual subtitles provided (SRT format or JSON array)
    if (manual_subtitles) {
      console.log(`[Whisper] Processing manual subtitles for video: ${video_id}`);
      
      let subtitles: Array<{start: number, end: number, text: string}> = [];
      
      // Check if it's SRT format (string) or JSON array
      if (typeof manual_subtitles === 'string') {
        subtitles = parseSRT(manual_subtitles);
        console.log(`[Whisper] Parsed SRT: ${subtitles.length} entries`);
      } else if (Array.isArray(manual_subtitles)) {
        subtitles = manual_subtitles;
        console.log(`[Whisper] Using JSON array: ${subtitles.length} entries`);
      }

      if (subtitles.length === 0) {
        throw new Error('No valid subtitles found in input');
      }

      // Save to database
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

      console.log(`[Whisper] Manual subtitles saved successfully`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `자막 저장 완료: ${subtitles.length}개 세그먼트`,
          subtitles_count: subtitles.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no manual subtitles, create placeholder for manual entry
    console.log(`[Whisper] Creating placeholder for video: ${video_id}`);
    
    const placeholderSubtitles = [
      { start: 0, end: 5, text: '[자막을 입력해주세요]' }
    ];

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
      console.error('[Whisper] Error saving placeholder:', subtitleError);
      throw subtitleError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '자막 템플릿이 생성되었습니다. 자막 검수에서 직접 입력해주세요.',
        subtitles_count: 1,
        needs_manual_input: true
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

// Parse SRT format to subtitle array
function parseSRT(srtContent: string): Array<{start: number, end: number, text: string}> {
  const subtitles: Array<{start: number, end: number, text: string}> = [];
  
  // Split by double newline to get blocks
  const blocks = srtContent.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    
    // Second line should be timestamp: 00:00:00,000 --> 00:00:05,000
    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    
    if (!timestampMatch) continue;
    
    const start = parseTimestamp(timestampMatch[1]);
    const end = parseTimestamp(timestampMatch[2]);
    const text = lines.slice(2).join(' ').trim();
    
    if (text) {
      subtitles.push({ start, end, text });
    }
  }
  
  return subtitles;
}

// Parse timestamp string to seconds
function parseTimestamp(timestamp: string): number {
  // Handle both comma and dot as decimal separator
  const normalized = timestamp.replace(',', '.');
  const parts = normalized.split(':');
  
  if (parts.length !== 3) return 0;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  
  return hours * 3600 + minutes * 60 + seconds;
}
