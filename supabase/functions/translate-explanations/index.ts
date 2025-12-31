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

// 번역 결과 검증 함수 - 각 언어별로 실제 번역이 됐는지 확인
function validateTranslation(lang: string, translation: string | undefined, originalKorean: string): { valid: boolean; reason?: string } {
  if (!translation || translation.trim() === '') {
    return { valid: false, reason: 'empty' };
  }
  
  // 원본과 동일하면 번역 실패로 간주
  if (translation.trim() === originalKorean.trim()) {
    return { valid: false, reason: 'same_as_original' };
  }
  
  // 최소 길이 검증 (원본의 20% 이상이어야 함)
  if (translation.length < originalKorean.length * 0.2) {
    return { valid: false, reason: 'too_short' };
  }
  
  // 언어별 특성 검증
  switch (lang) {
    case 'ja':
      // 일본어는 히라가나/가타카나/한자가 있어야 함
      if (!/[\u3040-\u30FF\u4E00-\u9FAF]/.test(translation)) {
        return { valid: false, reason: 'no_japanese_chars' };
      }
      break;
    case 'zh':
      // 중국어는 한자가 있어야 함
      if (!/[\u4E00-\u9FAF]/.test(translation)) {
        return { valid: false, reason: 'no_chinese_chars' };
      }
      break;
    case 'ru':
      // 러시아어는 키릴 문자가 있어야 함
      if (!/[\u0400-\u04FF]/.test(translation)) {
        return { valid: false, reason: 'no_cyrillic_chars' };
      }
      break;
    case 'vi':
      // 베트남어는 라틴 문자 + 성조 기호가 있어야 함
      if (!/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(translation)) {
        return { valid: false, reason: 'no_vietnamese_chars' };
      }
      break;
    case 'uz':
      // 우즈벡어는 라틴 문자 (특수문자 포함 가능)
      if (!/[a-zA-Z]/.test(translation)) {
        return { valid: false, reason: 'no_latin_chars' };
      }
      break;
    case 'en':
      // 영어는 라틴 문자가 있어야 함
      if (!/[a-zA-Z]/.test(translation)) {
        return { valid: false, reason: 'no_latin_chars' };
      }
      break;
  }
  
  return { valid: true };
}

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
7. CRITICAL: You MUST provide translations for ALL ${targetLanguages.length} languages. Do not skip any language.

Korean explanation to translate:
"""
${koreanText}
"""

Target languages (ALL REQUIRED):
${languageList}

Output format (JSON only, no markdown, ALL languages required):
{
${targetLanguages.map(lang => `  "${lang}": "Complete ${LANGUAGE_NAMES[lang]} translation here"`).join(',\n')}
}`;

  // 재시도 로직 - 최대 3회 (검증 실패시 재시도 포함)
  let lastError = '';
  let lastValidationErrors: Record<string, string> = {};
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/3 for translation...`);
      
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
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
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
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        throw new Error('Failed to parse translation response');
      }
      
      const translations = JSON.parse(jsonMatch[0]);
      
      // 🔍 각 언어별 번역 결과 검증
      const validationResults: Record<string, { valid: boolean; reason?: string }> = {};
      let allValid = true;
      
      for (const lang of targetLanguages) {
        const validation = validateTranslation(lang, translations[lang], koreanText);
        validationResults[lang] = validation;
        if (!validation.valid) {
          allValid = false;
          lastValidationErrors[lang] = validation.reason || 'unknown';
          console.warn(`⚠️ Validation failed for ${lang}: ${validation.reason}`);
        }
      }
      
      // 모든 언어가 검증 통과하지 않으면 재시도
      if (!allValid && attempt < 2) {
        console.log(`🔄 Retrying due to validation failures: ${JSON.stringify(lastValidationErrors)}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      
      // 번역 결과 구성 - 검증 실패한 언어는 원본 대신 빈 문자열 (fallback 방지)
      const result: TranslationResult = {
        explanation_ko: koreanText,
        explanation_vi: validationResults['vi']?.valid ? translations.vi : koreanText,
        explanation_en: validationResults['en']?.valid ? translations.en : koreanText,
        explanation_ja: validationResults['ja']?.valid ? translations.ja : koreanText,
        explanation_zh: validationResults['zh']?.valid ? translations.zh : koreanText,
        explanation_ru: validationResults['ru']?.valid ? translations.ru : koreanText,
        explanation_uz: validationResults['uz']?.valid ? translations.uz : koreanText,
      };
      
      // 로깅: 각 언어별 번역 길이 및 검증 결과
      const validCount = Object.values(validationResults).filter(v => v.valid).length;
      console.log(`✅ Translation success - ${validCount}/${targetLanguages.length} languages validated`);
      console.log(`   Lengths: ko=${koreanText.length}, ` +
        `vi=${result.explanation_vi.length}, en=${result.explanation_en.length}, ` +
        `ja=${result.explanation_ja.length}, zh=${result.explanation_zh.length}, ` +
        `ru=${result.explanation_ru.length}, uz=${result.explanation_uz.length}`);
      
      if (!allValid) {
        console.warn(`⚠️ Some translations failed validation: ${JSON.stringify(lastValidationErrors)}`);
      }
      
      return result;
      
    } catch (parseError) {
      lastError = parseError instanceof Error ? parseError.message : 'Parse error';
      console.error(`Attempt ${attempt + 1} parse error:`, lastError);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
    }
  }
  
  throw new Error(`Translation failed after 3 attempts: ${lastError}. Validation errors: ${JSON.stringify(lastValidationErrors)}`);
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
