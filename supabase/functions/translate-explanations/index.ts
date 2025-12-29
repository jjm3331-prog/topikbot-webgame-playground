import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface TranslateRequest {
  explanation_ko: string;
  targetLanguages?: string[];
}

interface TranslationResult {
  explanation_ko: string;
  explanation_vi: string;
  explanation_en: string;
  explanation_ja: string;
  explanation_zh: string;
  explanation_ru: string;
  explanation_uz: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English', 
  ja: 'Japanese',
  zh: 'Simplified Chinese',
  ru: 'Russian',
  uz: 'Uzbek'
};

async function translateWithGemini(koreanText: string, targetLanguages: string[]): Promise<TranslationResult> {
  const languageList = targetLanguages.map(lang => `- ${lang}: ${LANGUAGE_NAMES[lang]}`).join('\n');
  
  const prompt = `You are a professional translator specializing in Korean language education (TOPIK exam).
Translate the following Korean explanation into multiple languages.

IMPORTANT RULES:
1. Keep Korean grammar terms and example sentences in Korean characters (한글)
2. Translate ONLY the explanatory text
3. Maintain the same formatting and structure
4. Be accurate and natural in each target language
5. Output ONLY valid JSON, no markdown or extra text

Korean explanation to translate:
"""
${koreanText}
"""

Target languages:
${languageList}

Output format (JSON only):
{
  "vi": "Vietnamese translation here",
  "en": "English translation here",
  "ja": "Japanese translation here",
  "zh": "Chinese translation here",
  "ru": "Russian translation here",
  "uz": "Uzbek translation here"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Failed to parse JSON from response:', text);
    throw new Error('Failed to parse translation response');
  }
  
  const translations = JSON.parse(jsonMatch[0]);
  
  return {
    explanation_ko: koreanText,
    explanation_vi: translations.vi || koreanText,
    explanation_en: translations.en || koreanText,
    explanation_ja: translations.ja || koreanText,
    explanation_zh: translations.zh || koreanText,
    explanation_ru: translations.ru || koreanText,
    explanation_uz: translations.uz || koreanText,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { explanation_ko, targetLanguages = ['vi', 'en', 'ja', 'zh', 'ru', 'uz'] }: TranslateRequest = await req.json();

    if (!explanation_ko || explanation_ko.trim().length === 0) {
      throw new Error('explanation_ko is required');
    }

    console.log(`🌐 Translating explanation to ${targetLanguages.length} languages...`);

    const result = await translateWithGemini(explanation_ko, targetLanguages);

    console.log('✅ Translation completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Translation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
