import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGES = ['vi', 'en', 'ja', 'zh', 'ru', 'uz'];
const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  ru: 'Russian',
  uz: 'Uzbek'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_id } = await req.json();
    
    if (!video_id) {
      throw new Error('video_id is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Korean subtitles
    const { data: koreanSub, error: fetchError } = await supabase
      .from('video_subtitles')
      .select('subtitles')
      .eq('video_id', video_id)
      .eq('language', 'ko')
      .single();

    if (fetchError || !koreanSub) {
      throw new Error('Korean subtitles not found');
    }

    const koreanSubtitles = koreanSub.subtitles as Array<{ start: number; end: number; text: string }>;
    
    // Translate to each language
    const results: Record<string, boolean> = {};

    for (const lang of LANGUAGES) {
      try {
        console.log(`Translating to ${lang}...`);
        
        // Batch translate all subtitle texts
        const textsToTranslate = koreanSubtitles.map(s => s.text).join('\n---SEPARATOR---\n');
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are a professional translator. Translate the following Korean subtitles to ${LANGUAGE_NAMES[lang]}. 
Keep the translations natural and conversational.
Each subtitle is separated by "---SEPARATOR---".
Return ONLY the translated texts, separated by "---SEPARATOR---". Do not add any explanations.`
              },
              {
                role: 'user',
                content: textsToTranslate
              }
            ],
          }),
        });

        if (!response.ok) {
          console.error(`Translation failed for ${lang}:`, await response.text());
          results[lang] = false;
          continue;
        }

        const data = await response.json();
        const translatedText = data.choices?.[0]?.message?.content || '';
        const translatedParts = translatedText.split(/---SEPARATOR---/g).map((t: string) => t.trim());

        // Build translated subtitles array
        const translatedSubtitles = koreanSubtitles.map((sub, idx) => ({
          start: sub.start,
          end: sub.end,
          text: translatedParts[idx] || sub.text
        }));

        // Save translated subtitles
        const { error: saveError } = await supabase
          .from('video_subtitles')
          .upsert({
            video_id,
            language: lang,
            subtitles: translatedSubtitles,
            is_reviewed: false
          }, {
            onConflict: 'video_id,language'
          });

        if (saveError) {
          console.error(`Error saving ${lang} subtitles:`, saveError);
          results[lang] = false;
        } else {
          results[lang] = true;
          console.log(`Successfully translated to ${lang}`);
        }

      } catch (langError) {
        console.error(`Error translating to ${lang}:`, langError);
        results[lang] = false;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Translation completed for ${Object.values(results).filter(Boolean).length}/${LANGUAGES.length} languages`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in video-translate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
