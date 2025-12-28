import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gemini API 직접 호출 (Thinking Budget 최대치)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface VocabItem {
  id: string;
  word: string;
  pos: string;
  level: number;
  example_phrase: string;
}

// 시스템 프롬프트들
const CLOZE_SYSTEM_PROMPT = `당신은 TOPIK 한국어 교육 전문가입니다. 주어진 단어로 빈칸 채우기 문제를 만들어주세요.

규칙:
1. 자연스러운 한국어 문장을 만드세요
2. 오답은 학습자가 헷갈릴 만한 유사 단어로 생성하세요
3. 문장은 해당 TOPIK 레벨에 맞는 난이도여야 합니다

JSON 형식으로 응답:
{
  "sentence": "문장 (정답 단어 위치에 _____ 표시)",
  "blank_word": "정답 단어",
  "wrong_answer": "헷갈리는 오답",
  "hint": "힌트 (선택사항)"
}`;

const OX_SYSTEM_PROMPT = `당신은 TOPIK 한국어 문법 전문가입니다. 한국어 문법 규칙에 대한 O/X 퀴즈를 만들어주세요.

규칙:
1. 명확한 문법 포인트를 다루세요
2. O (맞음) 또는 X (틀림) 문제를 골고루 만드세요
3. 상세한 설명을 포함하세요
4. 베트남어 설명도 함께 제공하세요

JSON 배열 형식으로 응답 (5개씩):
[
  {
    "statement": "문법 규칙 설명",
    "is_correct": true/false,
    "explanation": "한국어 해설",
    "explanation_vi": "베트남어 해설",
    "grammar_point": "문법 포인트 (예: -아서/-어서)"
  }
]`;

const IDIOM_SYSTEM_PROMPT = `당신은 한국어 관용표현 전문가입니다. 한국어 관용표현의 상세 정보를 생성해주세요.

규칙:
1. 직역 의미와 실제 의미를 명확히 구분하세요
2. 실제 사용 상황 예시를 제공하세요
3. 유사한 표현을 2-3개 제시하세요
4. 베트남어 번역도 포함하세요

JSON 형식으로 응답:
{
  "idiom": "관용표현",
  "literal_meaning": "직역 (글자 그대로의 의미)",
  "actual_meaning": "실제 의미",
  "actual_meaning_vi": "베트남어 의미",
  "situation_example": "상황 예시 (대화 또는 상황 설명)",
  "similar_expressions": ["유사표현1", "유사표현2"]
}`;

// Gemini 2.5 Flash API 직접 호출 (Thinking Budget 최대치)
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
        // Thinking Budget 최대치 설정 (24576 토큰)
        thinkingConfig: {
          thinkingBudget: 24576
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Batch Generate] Gemini API error:', response.status, error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Gemini API 응답 구조 파싱
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    console.error('[Batch Generate] No content in Gemini response:', JSON.stringify(data));
    throw new Error('No content in Gemini response');
  }
  
  console.log('[Batch Generate] Gemini thinking tokens used:', data.usageMetadata?.thoughtsTokenCount || 0);
  
  return content;
}

function extractJSON(text: string): any {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                    text.match(/(\[[\s\S]*\])/) ||
                    text.match(/(\{[\s\S]*\})/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return JSON.parse(text.trim());
    }
  }
  return JSON.parse(text.trim());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, level, batchSize = 20 } = await req.json();

    if (!type) {
      return new Response(JSON.stringify({ error: 'type is required (cloze, ox, idiom, translate)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Batch Generate] Starting ${type} generation for level ${level || 'all'}, batch size: ${batchSize}`);
    console.log(`[Batch Generate] Using Gemini 2.5 Flash with max thinking budget (24576 tokens)`);

    let result: any = { success: true, generated: 0, errors: 0 };

    if (type === 'cloze') {
      // Cloze 문제 생성
      const query = supabase
        .from('topik_vocabulary')
        .select('id, word, pos, level, example_phrase')
        .order('seq_no')
        .limit(batchSize);
      
      if (level && !isNaN(Number(level))) {
        query.eq('level', Number(level));
      }
      
      const { data: vocabItems, error: vocabError } = await query;
      
      if (vocabError) throw vocabError;
      
      console.log(`[Batch Generate] Found ${vocabItems?.length || 0} vocabulary items for cloze generation`);
      
      for (const vocab of (vocabItems || [])) {
        try {
          const { data: existing } = await supabase
            .from('cloze_questions')
            .select('id')
            .eq('vocabulary_id', vocab.id)
            .maybeSingle();
          
          if (existing) {
            console.log(`[Batch Generate] Cloze already exists for ${vocab.word}, skipping`);
            continue;
          }
          
          const userPrompt = `단어: ${vocab.word}
품사: ${vocab.pos}
레벨: TOPIK ${vocab.level}급
예시: ${vocab.example_phrase}

이 단어를 사용한 빈칸 채우기 문제를 만들어주세요.`;

          const response = await callGemini(CLOZE_SYSTEM_PROMPT, userPrompt);
          const clozeData = extractJSON(response);
          
          const { error: insertError } = await supabase
            .from('cloze_questions')
            .insert({
              vocabulary_id: vocab.id,
              level: vocab.level,
              sentence: clozeData.sentence,
              blank_word: clozeData.blank_word,
              wrong_answer: clozeData.wrong_answer,
              hint: clozeData.hint || null,
              difficulty: vocab.level <= 2 ? '초급' : vocab.level <= 4 ? '중급' : '고급',
            });
          
          if (insertError) {
            console.error(`[Batch Generate] Insert error for ${vocab.word}:`, insertError);
            result.errors++;
          } else {
            result.generated++;
            console.log(`[Batch Generate] Generated cloze for: ${vocab.word}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (e) {
          console.error(`[Batch Generate] Error generating cloze for ${vocab.word}:`, e);
          result.errors++;
        }
      }
    }

    if (type === 'ox') {
      const targetLevel = level || 1;
      const levelName = targetLevel <= 2 ? '초급' : targetLevel <= 4 ? '중급' : '고급';
      
      const userPrompt = `TOPIK ${targetLevel}급 (${levelName}) 수준의 한국어 문법 O/X 퀴즈 5개를 만들어주세요.

${targetLevel}급에 맞는 문법 포인트:
${targetLevel <= 2 ? '- 기본 조사 (이/가, 은/는, 을/를)\n- 기본 어미 (-아요/-어요, -았/었-)\n- 존댓말/반말\n- 숫자, 시간 표현' : ''}
${targetLevel >= 3 && targetLevel <= 4 ? '- 연결 어미 (-면서, -기 때문에, -는데)\n- 간접 인용 (-다고 하다)\n- 피동/사동\n- 추측 표현 (-ㄴ 것 같다)' : ''}
${targetLevel >= 5 ? '- 고급 연결 어미 (-는 바, -기 마련이다)\n- 격식체\n- 한자어 관용 표현\n- 학술적 표현' : ''}`;

      try {
        const response = await callGemini(OX_SYSTEM_PROMPT, userPrompt);
        const oxQuestions = extractJSON(response);
        
        if (Array.isArray(oxQuestions)) {
          for (const q of oxQuestions) {
            const { error: insertError } = await supabase
              .from('grammar_ox_questions')
              .insert({
                level: targetLevel,
                statement: q.statement,
                is_correct: q.is_correct,
                explanation: q.explanation,
                explanation_vi: q.explanation_vi || null,
                grammar_point: q.grammar_point || null,
                difficulty: levelName,
              });
            
            if (insertError) {
              console.error('[Batch Generate] OX insert error:', insertError);
              result.errors++;
            } else {
              result.generated++;
            }
          }
        }
      } catch (e) {
        console.error('[Batch Generate] OX generation error:', e);
        result.errors++;
      }
    }

    if (type === 'idiom') {
      const targetLevel = level || 3;
      
      const koreanIdioms = [
        { idiom: '발이 넓다', level: 3 },
        { idiom: '눈이 높다', level: 3 },
        { idiom: '손이 크다', level: 3 },
        { idiom: '입이 가볍다', level: 3 },
        { idiom: '귀가 얇다', level: 3 },
        { idiom: '배가 아프다', level: 4 },
        { idiom: '눈에 밟히다', level: 4 },
        { idiom: '발을 끊다', level: 4 },
        { idiom: '손을 놓다', level: 4 },
        { idiom: '가슴이 뜨겁다', level: 4 },
        { idiom: '목이 빠지게 기다리다', level: 5 },
        { idiom: '발 벗고 나서다', level: 5 },
        { idiom: '손에 땀을 쥐다', level: 5 },
        { idiom: '눈 깜짝할 사이', level: 5 },
        { idiom: '하늘의 별 따기', level: 6 },
      ];
      
      const idiomToGenerate = koreanIdioms.filter(i => i.level === targetLevel).slice(0, batchSize);
      
      for (const idiomItem of idiomToGenerate) {
        try {
          const { data: existing } = await supabase
            .from('topik_idioms')
            .select('id')
            .eq('idiom', idiomItem.idiom)
            .maybeSingle();
          
          if (existing) {
            console.log(`[Batch Generate] Idiom already exists: ${idiomItem.idiom}, skipping`);
            continue;
          }
          
          const userPrompt = `관용표현: ${idiomItem.idiom}
TOPIK 레벨: ${idiomItem.level}급

이 관용표현의 상세 정보를 생성해주세요.`;

          const response = await callGemini(IDIOM_SYSTEM_PROMPT, userPrompt);
          const idiomData = extractJSON(response);
          
          const { error: insertError } = await supabase
            .from('topik_idioms')
            .insert({
              level: idiomItem.level,
              idiom: idiomData.idiom || idiomItem.idiom,
              literal_meaning: idiomData.literal_meaning,
              actual_meaning: idiomData.actual_meaning,
              actual_meaning_vi: idiomData.actual_meaning_vi || null,
              situation_example: idiomData.situation_example || null,
              similar_expressions: idiomData.similar_expressions || [],
              difficulty: idiomItem.level <= 3 ? '초급' : idiomItem.level <= 4 ? '중급' : '고급',
            });
          
          if (insertError) {
            console.error(`[Batch Generate] Idiom insert error for ${idiomItem.idiom}:`, insertError);
            result.errors++;
          } else {
            result.generated++;
            console.log(`[Batch Generate] Generated idiom: ${idiomItem.idiom}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (e) {
          console.error(`[Batch Generate] Error generating idiom ${idiomItem.idiom}:`, e);
          result.errors++;
        }
      }
    }

    if (type === 'translate') {
      // 번역 생성 (어휘에 다국어 번역 추가) - 고품질 번역
      let query = supabase
        .from('topik_vocabulary')
        .select('id, word, pos, example_phrase, level')
        .is('meaning_vi', null)
        .order('seq_no')
        .limit(batchSize);
      
      // level 필터링 추가
      if (level && !isNaN(Number(level))) {
        query = query.eq('level', Number(level));
      }
      
      const { data: vocabItems, error: vocabError } = await query;
      
      if (vocabError) throw vocabError;
      
      console.log(`[Batch Generate] Found ${vocabItems?.length || 0} vocabulary items for translation`);
      
      for (const vocab of (vocabItems || [])) {
        try {
          const userPrompt = `한국어 단어: ${vocab.word}
품사: ${vocab.pos}
TOPIK 레벨: ${vocab.level}급
예시 구: ${vocab.example_phrase}

다음 7개 언어로 이 단어의 의미와 예문을 번역해주세요.
정확하고 자연스러운 번역이 중요합니다. 각 언어의 뉘앙스를 살려주세요.

1. 베트남어 (vi) - 베트남어 원어민이 자연스럽게 이해할 수 있는 표현
2. 영어 (en) - 간결하고 정확한 영어 번역
3. 일본어 (ja) - 히라가나/가타카나/한자 적절히 사용
4. 중국어 간체 (zh) - 중국 본토 표준 중국어
5. 러시아어 (ru) - 러시아어 원어민 표현
6. 우즈베크어 (uz) - 현대 우즈베크어 표현
7. 예문 - 단어를 사용한 자연스러운 한국어 예문과 베트남어 번역

JSON 형식:
{
  "meaning_vi": "베트남어 뜻",
  "meaning_en": "영어 뜻",
  "meaning_ja": "일본어 뜻",
  "meaning_zh": "중국어 뜻",
  "meaning_ru": "러시아어 뜻",
  "meaning_uz": "우즈베크어 뜻",
  "example_sentence": "한국어 예문 (완전한 문장)",
  "example_sentence_vi": "예문 베트남어 번역"
}`;

          const response = await callGemini(
            `당신은 한국어와 다국어 번역 전문가입니다. 
TOPIK 한국어 능력시험 어휘를 다양한 언어로 정확하게 번역합니다.
각 언어의 문화적 맥락과 뉘앙스를 고려하여 자연스러운 번역을 제공하세요.
반드시 유효한 JSON 형식으로 응답하세요.`,
            userPrompt
          );
          const translations = extractJSON(response);
          
          const { error: updateError } = await supabase
            .from('topik_vocabulary')
            .update({
              meaning_vi: translations.meaning_vi,
              meaning_en: translations.meaning_en,
              meaning_ja: translations.meaning_ja,
              meaning_zh: translations.meaning_zh,
              meaning_ru: translations.meaning_ru,
              meaning_uz: translations.meaning_uz,
              example_sentence: translations.example_sentence,
              example_sentence_vi: translations.example_sentence_vi,
            })
            .eq('id', vocab.id);
          
          if (updateError) {
            console.error(`[Batch Generate] Translation update error for ${vocab.word}:`, updateError);
            result.errors++;
          } else {
            result.generated++;
            console.log(`[Batch Generate] Translated: ${vocab.word} (Level ${vocab.level})`);
          }
          
          // Thinking Budget 사용으로 더 긴 딜레이
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (e) {
          console.error(`[Batch Generate] Error translating ${vocab.word}:`, e);
          result.errors++;
        }
      }
    }

    console.log(`[Batch Generate] Completed: ${result.generated} generated, ${result.errors} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Batch Generate] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
