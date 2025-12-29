import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English', 
  ja: 'Japanese',
  zh: 'Simplified Chinese',
  ru: 'Russian',
  uz: 'Uzbek'
};

interface TranslationResult {
  vi?: string;
  en?: string;
  ja?: string;
  zh?: string;
  ru?: string;
  uz?: string;
}

async function translateWithGemini(koreanText: string, targetLanguages: string[]): Promise<TranslationResult> {
  const languageList = targetLanguages.map(lang => `- ${lang}: ${LANGUAGE_NAMES[lang]}`).join('\n');
  
  const prompt = `You are an expert translator specializing in Korean language education (TOPIK exam).
Translate the following Korean explanation into ${targetLanguages.length} languages.

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
${targetLanguages.map(lang => `  "${lang}": "${LANGUAGE_NAMES[lang]} translation here"`).join(',\n')}
}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Attempt ${attempt + 1} failed: ${response.status} - ${errorText}`);
        if (response.status === 503 || response.status === 429) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`Attempt ${attempt + 1}: Failed to parse JSON from: ${text.substring(0, 200)}`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error('Failed to parse translation response');
      }
      
      const translations = JSON.parse(jsonMatch[0]);
      return translations;
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} error:`, error);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Translation failed after 3 attempts');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { questionIds, hoursAgo = 1 } = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 특정 ID가 제공되면 해당 ID로, 아니면 최근 시간 기준으로 쿼리
    let query = supabase
      .from('mock_question_bank')
      .select('id, explanation_ko, explanation_vi, explanation_en, explanation_ja, explanation_zh, explanation_ru, explanation_uz');
    
    if (questionIds && questionIds.length > 0) {
      query = query.in('id', questionIds);
    } else {
      query = query.gte('created_at', new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString());
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch questions: ${fetchError.message}`);
    }

    console.log(`📋 Found ${questions?.length || 0} questions to check`);

    // 번역이 누락된 문제 찾기
    const needsTranslation: { id: string; explanation_ko: string; missingLangs: string[] }[] = [];
    
    for (const q of questions || []) {
      const missingLangs: string[] = [];
      
      if (!q.explanation_ja || q.explanation_ja === '' || q.explanation_ja === q.explanation_ko) {
        missingLangs.push('ja');
      }
      if (!q.explanation_zh || q.explanation_zh === '' || q.explanation_zh === q.explanation_ko) {
        missingLangs.push('zh');
      }
      if (!q.explanation_ru || q.explanation_ru === '' || q.explanation_ru === q.explanation_ko) {
        missingLangs.push('ru');
      }
      if (!q.explanation_uz || q.explanation_uz === '' || q.explanation_uz === q.explanation_ko) {
        missingLangs.push('uz');
      }
      if (!q.explanation_vi || q.explanation_vi === '' || q.explanation_vi === q.explanation_ko) {
        missingLangs.push('vi');
      }
      if (!q.explanation_en || q.explanation_en === '' || q.explanation_en === q.explanation_ko) {
        missingLangs.push('en');
      }
      
      if (missingLangs.length > 0 && q.explanation_ko) {
        needsTranslation.push({
          id: q.id,
          explanation_ko: q.explanation_ko,
          missingLangs
        });
      }
    }

    console.log(`🔄 ${needsTranslation.length} questions need translation`);

    let successCount = 0;
    let failCount = 0;
    const results: { id: string; success: boolean; error?: string }[] = [];

    // 번역 실행 (순차적으로 - rate limit 방지)
    for (const item of needsTranslation) {
      try {
        console.log(`🌐 Translating ${item.id} for languages: ${item.missingLangs.join(', ')}`);
        
        const translations = await translateWithGemini(item.explanation_ko, item.missingLangs);
        
        // DB 업데이트 객체 생성
        const updateObj: Record<string, string> = {};
        for (const lang of item.missingLangs) {
          const translation = translations[lang as keyof TranslationResult];
          if (translation && translation.length > 0) {
            updateObj[`explanation_${lang}`] = translation;
          }
        }
        
        if (Object.keys(updateObj).length > 0) {
          const { error: updateError } = await supabase
            .from('mock_question_bank')
            .update(updateObj)
            .eq('id', item.id);
          
          if (updateError) {
            throw new Error(`DB update failed: ${updateError.message}`);
          }
          
          console.log(`✅ Updated ${item.id} with ${Object.keys(updateObj).length} translations`);
          successCount++;
          results.push({ id: item.id, success: true });
        }
        
        // Rate limit 방지를 위한 딜레이
        await new Promise(r => setTimeout(r, 500));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to translate ${item.id}:`, errorMsg);
        failCount++;
        results.push({ id: item.id, success: false, error: errorMsg });
      }
    }

    console.log(`✅ Translation complete: ${successCount} success, ${failCount} failed`);

    return new Response(JSON.stringify({
      total: needsTranslation.length,
      success: successCount,
      failed: failCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Retranslate error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
