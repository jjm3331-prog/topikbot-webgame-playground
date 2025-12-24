import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 정교한 시스템 프롬프트 - 정확성과 교육적 가치 최우선
const SYSTEM_PROMPT = `당신은 한국어 교육 전문가이자 TOPIK 시험 출제위원 수준의 콘텐츠 제작자입니다.

## 핵심 원칙
1. **정확성 최우선**: 모든 한국어 표현, 문법 설명, 예문은 100% 정확해야 합니다
2. **TOPIK 기준 준수**: 해당 레벨에 맞는 어휘와 문법만 사용하세요
3. **실용성**: 실생활에서 바로 활용 가능한 내용을 우선하세요
4. **체계성**: 학습 단계를 고려한 점진적 난이도 구성

## 출력 형식
반드시 다음 JSON 형식으로만 응답하세요:
{
  "questions": [
    {
      "id": 1,
      "question": "영어로 된 질문",
      "questionKo": "한국어로 된 질문",
      "options": [
        {"label": "선택지1", "value": "a"},
        {"label": "선택지2", "value": "b"},
        {"label": "선택지3", "value": "c"},
        {"label": "선택지4", "value": "d"}
      ],
      "correctAnswer": "정답 value (a/b/c/d)",
      "explanation": "영어 해설",
      "explanationKo": "한국어 해설"
    }
  ]
}

## 카테고리별 문제 유형

### vocabulary (어휘)
- 단어 의미 파악
- 유의어/반의어
- 문맥에 맞는 어휘 선택
- 한자어 vs 고유어 구분

### grammar (문법)
- 조사 사용 (은/는, 이/가, 을/를, 에/에서 등)
- 어미 활용 (-아요/어요, -았/었-, -겠-, -ㄹ 거예요 등)
- 문장 구조 (주어-목적어-서술어)
- 높임법 (격식체/비격식체, 존칭)

### reading (읽기)
- 지문 이해
- 중심 내용 파악
- 세부 정보 찾기
- 글의 목적/의도 파악

### listening (듣기)
- 대화 상황 파악
- 화자의 의도 이해
- 장소/시간/인물 추론
- 안내 방송 이해

### mock_test (모의고사)
- 실제 TOPIK 형식
- 통합 유형 문제
- 시간 제한 연습

## 레벨별 기준

### Level 1-2 (TOPIK I)
- 기초 어휘 800-1500개
- 기본 문법 (현재/과거시제, 기본 조사)
- 일상 대화 주제

### Level 3-4 (TOPIK II 중급)
- 어휘 3000-5000개
- 복합 문법 (-면서, -기 때문에, -ㄴ/은 것 같다)
- 사회적 주제 (뉴스, 사설)

### Level 5-6 (TOPIK II 고급)
- 어휘 6000개 이상
- 고급 문법 (-는 바, -기 마련이다, -는 셈이다)
- 전문적/학술적 주제

## 제공된 컨텍스트 활용
RAG 검색으로 제공된 지식 문서를 우선적으로 참고하여 문제를 생성하세요.
컨텍스트가 없거나 부족한 경우, 위 기준에 따라 자체적으로 생성하되 정확성을 최우선으로 하세요.

정확히 5개의 문제를 생성하세요.`;

// Generate query embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Rerank results using Cohere
async function rerankResults(
  query: string, 
  documents: { id: string; content: string; similarity: number; document_title: string }[],
  apiKey: string,
  topN: number = 5
): Promise<typeof documents> {
  if (documents.length === 0) return [];

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'rerank-v3.5',
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    console.error('Cohere rerank error:', await response.text());
    return documents.slice(0, topN);
  }

  const data = await response.json();
  return data.results.map((result: { index: number; relevance_score: number }) => ({
    ...documents[result.index],
    rerank_score: result.relevance_score,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lessonId, category, level, title } = await req.json();

    if (!lessonId || !category || !level) {
      return new Response(JSON.stringify({ error: 'lessonId, category, level are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Build semantic search query
    const searchQuery = `TOPIK Level ${level} ${category} 한국어 ${title || ''} 학습 문제 예시`;
    console.log(`Searching for: ${searchQuery}`);

    // 2. Generate query embedding
    const queryEmbedding = await generateEmbedding(searchQuery, openAIApiKey);
    console.log('Query embedding generated');

    // 3. Vector similarity search
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.25, // Lower threshold for more results
        match_count: 15,
      }
    );

    let contextContent = '';
    
    if (!searchError && searchResults && searchResults.length > 0) {
      console.log(`Found ${searchResults.length} initial results`);

      // 4. Rerank with Cohere for semantic relevance
      let finalResults = searchResults;
      if (cohereApiKey) {
        console.log('Reranking with Cohere...');
        finalResults = await rerankResults(searchQuery, searchResults, cohereApiKey, 5);
        console.log(`Reranked to top ${finalResults.length} results`);
      }

      // 5. Build context from top results
      contextContent = finalResults
        .map((r: { document_title: string; content: string; rerank_score?: number }) => 
          `[문서: ${r.document_title}]\n${r.content}`
        )
        .join('\n\n---\n\n');
    } else {
      console.log('No RAG results found, generating without context');
    }

    // 6. Generate content using Lovable AI with low temperature for accuracy
    const userPrompt = `## 요청
레슨 ID: ${lessonId}
카테고리: ${category}
레벨: ${level}
제목: ${title || '일반'}

${contextContent ? `## 참고 자료 (RAG 검색 결과)\n${contextContent}\n\n` : ''}

위 정보를 바탕으로 TOPIK Level ${level}에 적합한 ${category} 문제 5개를 생성하세요.
반드시 JSON 형식으로만 응답하세요.`;

    console.log('Calling Lovable AI with temperature 0.4');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.4, // Low temperature for accuracy
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    console.log('AI response received, parsing JSON');

    // Parse JSON from response
    let questions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                        content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
      
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr.trim());
      questions = parsed.questions || parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        raw: content.substring(0, 500)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      questions,
      hasRagContext: contextContent.length > 0,
      ragResultCount: searchResults?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Lesson content error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
