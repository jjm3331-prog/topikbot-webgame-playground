import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelatedWordsResult {
  word: string;
  synonyms: { word: string; meaning?: string }[];
  antonyms: { word: string; meaning?: string }[];
  similar: { word: string; meaning?: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, targetLang = 'vi' } = await req.json();

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'word is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const langNames: Record<string, string> = {
      vi: 'Vietnamese',
      en: 'English',
      ja: 'Japanese',
      zh: 'Chinese',
      ru: 'Russian',
      uz: 'Uzbek',
      ko: 'Korean'
    };
    const langName = langNames[targetLang] || 'English';

    const prompt = `Korean word: "${word}"

Return JSON only (no explanation):
{"synonyms":[{"word":"한국어","meaning":"${langName} meaning"}],"antonyms":[{"word":"한국어","meaning":"${langName} meaning"}],"similar":[{"word":"한국어","meaning":"${langName} meaning"}]}

Rules:
- Max 3 per category
- Only genuinely related Korean words
- Empty array if none exist
- Meanings in ${langName}`;

    console.log(`Fetching related words for: ${word}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a Korean language expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'API failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let result: RelatedWordsResult = {
      word,
      synonyms: [],
      antonyms: [],
      similar: []
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          word,
          synonyms: parsed.synonyms || [],
          antonyms: parsed.antonyms || [],
          similar: parsed.similar || []
        };
      }
    } catch (parseError) {
      console.error('Parse error:', parseError, content);
    }

    console.log(`Found: ${result.synonyms.length} syn, ${result.antonyms.length} ant, ${result.similar.length} sim`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
