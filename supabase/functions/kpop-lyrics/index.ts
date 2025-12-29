import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { difficulty, excludeIds = [], count = 5 } = await req.json();
    
    console.log(`[KPop Lyrics] Request: difficulty=${difficulty}, excludeIds=${excludeIds.length}, count=${count}`);
    
    // This function now returns empty - K-Pop lyrics quiz is disabled
    // The quiz feature requires properly licensed content
    
    return new Response(
      JSON.stringify({
        questions: [],
        message: "K-Pop 가사 퀴즈는 현재 준비 중입니다. 곧 새로운 콘텐츠로 돌아올게요!"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[KPop Lyrics] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        questions: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
