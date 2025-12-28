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
  sourceUrl?: string;
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

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Language display names for prompt
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

    const systemPrompt = `You are a Korean language expert. For the given Korean word, provide accurate synonyms (동의어), antonyms (반의어), and similar words (유사어). 
Be concise and only provide words that are genuinely related. If no related words exist for a category, return an empty array for that category.
The meanings should be in ${langName}.`;

    const userPrompt = `Korean word: "${word}"

Find and return in JSON format:
{
  "word": "${word}",
  "synonyms": [{"word": "Korean synonym", "meaning": "meaning in ${langName}"}],
  "antonyms": [{"word": "Korean antonym", "meaning": "meaning in ${langName}"}],
  "similar": [{"word": "Korean similar word", "meaning": "meaning in ${langName}"}]
}

Return maximum 3 items per category. Only include genuinely related words. Return empty arrays if none exist.`;

    console.log(`Searching related words for: ${word}`);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Parse JSON from response
    let result: RelatedWordsResult = {
      word,
      synonyms: [],
      antonyms: [],
      similar: [],
      sourceUrl: citations[0]
    };

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          word: parsed.word || word,
          synonyms: parsed.synonyms || [],
          antonyms: parsed.antonyms || [],
          similar: parsed.similar || [],
          sourceUrl: citations[0]
        };
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError, content);
    }

    console.log(`Found for ${word}: ${result.synonyms.length} synonyms, ${result.antonyms.length} antonyms, ${result.similar.length} similar`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in related-words:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
