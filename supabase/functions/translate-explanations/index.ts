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
  
  // 긴 해설 (200자 이상)에 대한 최적화된 프롬프트
  const isLongExplanation = koreanText.length >= 200;
  
  const prompt = `You are an expert translator specializing in Korean language education (TOPIK exam).
Translate the following Korean explanation into ${targetLanguages.length} languages.

${isLongExplanation ? `⚠️ This is a DETAILED explanation (${koreanText.length} characters). 
Preserve ALL content including:
- Problem analysis (문제 분석)
- Correct answer explanation (정답 해설)
- Wrong answer analysis (오답 분석)
- Grammar/vocabulary notes (문법/어휘)
- Example sentences (예문)
- Study tips (학습 팁)

Do NOT summarize or shorten. Translate COMPLETELY.` : ''}

IMPORTANT RULES:
1. Keep Korean grammar terms and example sentences in Korean characters (한글)
2. Translate ONLY the explanatory text, NOT the Korean examples
3. Maintain the EXACT same formatting, structure, and bullet points
4. Be accurate and natural in each target language
5. Output ONLY valid JSON, no markdown code blocks or extra text
6. Each translation should be COMPLETE - do not truncate

Korean explanation to translate:
"""
${koreanText}
"""

Target languages:
${languageList}

Output format (JSON only, no markdown):
{
  "vi": "Vietnamese translation here",
  "en": "English translation here",
  "ja": "Japanese translation here",
  "zh": "Chinese translation here",
  "ru": "Russian translation here",
  "uz": "Uzbek translation here"
}`;

  // 재시도 로직 추가 (최대 2회)
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              // 긴 해설에 대해 더 많은 토큰 허용
              maxOutputTokens: isLongExplanation ? 8192 : 4096,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Gemini API error: ${response.status} - ${errorText}`;
        console.error(`Attempt ${attempt + 1} failed:`, lastError);
        
        // 503/429 에러시 재시도
        if (response.status === 503 || response.status === 429) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error(lastError);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // JSON 파싱 시도
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        lastError = `Failed to parse JSON from response: ${text.substring(0, 200)}`;
        console.error(`Attempt ${attempt + 1}:`, lastError);
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw new Error('Failed to parse translation response');
      }
      
      const translations = JSON.parse(jsonMatch[0]);
      
      // 번역 결과 검증
      const result: TranslationResult = {
        explanation_ko: koreanText,
        explanation_vi: translations.vi || koreanText,
        explanation_en: translations.en || koreanText,
        explanation_ja: translations.ja || koreanText,
        explanation_zh: translations.zh || koreanText,
        explanation_ru: translations.ru || koreanText,
        explanation_uz: translations.uz || koreanText,
      };
      
      // 로깅: 각 언어별 번역 길이
      console.log(`✅ Translation success - lengths: ko=${koreanText.length}, ` +
        `vi=${result.explanation_vi.length}, en=${result.explanation_en.length}, ` +
        `ja=${result.explanation_ja.length}, zh=${result.explanation_zh.length}, ` +
        `ru=${result.explanation_ru.length}, uz=${result.explanation_uz.length}`);
      
      return result;
      
    } catch (parseError) {
      lastError = parseError instanceof Error ? parseError.message : 'Parse error';
      console.error(`Attempt ${attempt + 1} parse error:`, lastError);
      if (attempt < 1) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
    }
  }
  
  throw new Error(`Translation failed after 2 attempts: ${lastError}`);
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

    console.log(`🌐 Translating explanation (${explanation_ko.length} chars) to ${targetLanguages.length} languages...`);

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
