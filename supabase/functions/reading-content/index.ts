import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🚀 읽기 문제 생성 RAG 시스템
// ============================================
const RAG_CONFIG = {
  MATCH_THRESHOLD: 0.25,
  MATCH_COUNT: 30,
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 8,
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// 탭별 검색 쿼리 - 탭 유형에 맞는 문맥 제공
const TAB_QUERIES: Record<string, Record<string, string[]>> = {
  readingA: {
    grammar: [
      "한국어 조사 문법 을 를 이 가 은 는",
      "한국어 연결어미 문법 어서 으니까 지만 면서",
      "한국어 문법 빈칸 채우기 문제",
      "TOPIK 문법 문제 유형",
      "한국어 격조사 사용법",
    ],
    vocabulary: [
      "한국어 유의어 동의어 반의어",
      "TOPIK 어휘 문제 유형",
      "한국어 부사 형용사 의미",
      "한국어 표현 비슷한 말",
      "한국어 단어 뜻 의미",
    ],
    topic: [
      "한국어 주제 파악 읽기",
      "TOPIK 읽기 주제 찾기",
      "한국어 글의 중심 내용",
      "한국어 독해 문제",
      "짧은 글 주제 파악",
    ],
    advertisement: [
      "한국어 광고 안내문 읽기",
      "한국어 공지 안내 이해",
      "TOPIK 실용문 읽기",
      "한국어 표지판 안내문",
      "일상생활 한국어 안내",
    ],
  },
  readingB: {
    arrangement: [
      "한국어 문장 배열 순서",
      "TOPIK 문장 순서 맞추기",
      "한국어 글의 흐름 논리",
      "시간 순서 문장 연결",
      "한국어 접속사 연결어",
    ],
    inference: [
      "한국어 빈칸 추론 문제",
      "TOPIK 추론 문제 유형",
      "한국어 문맥 파악",
      "한국어 글 완성하기",
      "논리적 추론 한국어",
    ],
    paired: [
      "한국어 안내문 규칙 읽기",
      "TOPIK 연계 문제",
      "한국어 정보 찾기 문제",
      "도표 안내문 이해",
      "한국어 실용문 독해",
    ],
    long: [
      "한국어 긴 글 읽기 이해",
      "TOPIK 장문 독해",
      "한국어 지문 분석",
      "한국어 본문 이해 문제",
      "한국어 글 내용 파악",
    ],
  },
};

// OpenAI 임베딩 생성
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.EMBEDDING_MODEL,
      input: text,
      dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Cohere Rerank
async function rerankResults(
  query: string, 
  documents: any[],
  apiKey: string,
  topN: number
): Promise<any[]> {
  if (documents.length === 0) return [];

  console.log(`🔄 Cohere Reranking: ${documents.length} docs → top ${topN}`);

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.RERANK_MODEL,
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    console.log('⚠️ Fallback to vector similarity order');
    return documents.slice(0, topN);
  }

  const data = await response.json();
  return data.results.map((result: { index: number; relevance_score: number }) => ({
    ...documents[result.index],
    rerank_score: result.relevance_score,
  }));
}

// TOPIK 급수별 어휘/문법 가이드라인
const TOPIK_LEVEL_GUIDELINES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 난이도 가이드라인]
어휘:
- 기초 어휘 800~1500개 범위
- 일상생활 필수 단어 (가족, 음식, 날씨, 시간, 장소 등)
- 기본 동사/형용사: 가다, 오다, 먹다, 마시다, 좋다, 크다 등

문법:
- 기본 조사: 이/가, 을/를, 은/는, 에, 에서, 와/과
- 기본 어미: -습니다/-ㅂ니다, -아요/-어요, -고
- 간단한 연결어미: -고, -아서/-어서
- 시제: 현재, 과거 (-았/었-)
- 문장: 단문 위주, 짧고 간단한 문장

주제:
- 자기소개, 인사, 날씨, 쇼핑, 음식 주문
- 길 묻기, 약속 정하기, 취미

예시 문장:
- "저는 학생입니다."
- "오늘 날씨가 좋습니다."
- "친구와 같이 영화를 봤습니다."`,

  "3-4": `[TOPIK 3-4급 난이도 가이드라인]
어휘:
- 중급 어휘 3000~5000개 범위
- 사회생활 관련 어휘 (직장, 교육, 건강, 환경 등)
- 한자어 및 관용 표현 포함
- 추상적 개념 어휘: 문화, 사회, 경제, 환경

문법:
- 복합 조사: 에게, 한테, 께, 에서부터, 까지
- 연결어미: -으니까, -지만, -으면서, -다가, -느라고
- 보조용언: -어 있다, -고 있다, -어 보다, -어 주다
- 추측/의도 표현: -을 것 같다, -으려고 하다
- 간접 인용: -다고 하다, -냐고 하다, -자고 하다
- 피동/사동 표현

주제:
- 사회 문제, 문화 비교, 직장 생활
- 뉴스 이해, 설명문, 논설문
- 한국 문화와 관습

예시 문장:
- "요즘 1인 가구가 증가하고 있다고 합니다."
- "환경 문제를 해결하려면 모두가 노력해야 합니다."
- "이 책을 읽고 나서 생각이 많이 바뀌었습니다."`,

  "5-6": `[TOPIK 5-6급 난이도 가이드라인]
어휘:
- 고급 어휘 6000개 이상
- 전문 용어 및 학술 어휘
- 고급 한자어: 인식, 본질, 핵심, 현상, 관점
- 관용어, 속담, 사자성어
- 비유적/추상적 표현

문법:
- 고급 연결어미: -는 바람에, -은 나머지, -거니와, -건대
- 문어체 표현: -노라, -도다, -으리라, -건마는
- 복합 표현: -다시피 하다, -는 셈이다, -기 마련이다
- 고급 종결어미: -ㄴ/는다네, -다니까요, -거든요
- 높임법 전환, 격식체/비격식체 구분
- 담화 표지어: 그러니까, 아무튼, 어쨌든, 결국

주제:
- 학술 논문, 사설, 비평문
- 철학적/추상적 논의
- 심층 사회 분석, 정책 토론
- 문학 작품 분석

예시 문장:
- "이러한 현상의 본질을 파악하기 위해서는 다각적인 분석이 필요하다."
- "그의 주장이 일리가 있다고 하더라도 현실적인 한계를 간과해서는 안 된다."
- "전통 문화가 현대 사회에서 갖는 의의를 재조명할 필요가 있다."`,
};

// Gemini를 사용하여 TOPIK 스타일 문제 생성
async function generateQuestions(
  type: string,
  tabType: string,
  ragContent: string,
  count: number,
  geminiApiKey: string,
  topikLevel: string = "1-2"
): Promise<any[]> {
  // 탭별 문제 유형 정의
  const typePrompts: Record<string, Record<string, string>> = {
    readingA: {
      grammar: `빈칸 문법 문제를 생성하세요.
- 문장에 조사나 어미가 빈칸으로 된 문제
- 예: "저는 매일 운동( ) 합니다." → 을/를/이/가 중 선택
- 빈칸에는 괄호 ( )를 사용
- 조사: 을/를, 이/가, 은/는, 에/에서, 와/과 등
- 어미: -어서/-아서, -으니까, -면서, -지만, -고 등`,
      vocabulary: `유의어/의미 문제를 생성하세요.
- 특정 단어와 비슷한 의미의 단어 찾기
- 또는 반대 의미의 단어 찾기
- 예: "'매우'와 비슷한 의미는?" → 아주/조금/별로/전혀
- 문장 속에서 단어의 의미 파악`,
      topic: `주제 파악 문제를 생성하세요.
- 2-4문장 짧은 글의 주제 찾기
- 글의 중심 생각이나 내용 파악
- 예: 서울 박물관 소개 글 → "서울의 박물관"이 주제`,
      advertisement: `광고/안내문 문제를 생성하세요.
- 실용적인 안내문, 공지, 광고 읽기
- 정보 확인 및 이해 문제
- 운영시간, 규칙, 가격 등 구체적 정보 포함`,
    },
    readingB: {
      arrangement: `문장 배열 문제를 생성하세요.
- (가)(나)(다)(라) 4개 문장을 올바른 순서로 배열
- 시간 순서나 논리적 흐름 파악
- "그래서", "그런데", "하지만" 등 연결어 활용
- 예: 아침 일어남 → 준비 → 비 발견 → 우산 가져감`,
      inference: `빈칸 추론 문제를 생성하세요.
- 글의 마지막 부분이나 중간에 빈칸
- 문맥에서 논리적으로 추론하여 완성
- "왜냐하면", "그래서" 등 인과관계 활용
- 예: 아이들이 떡국을 먹고 싶어하는 이유 추론`,
      paired: `연계문제(정보 찾기)를 생성하세요.
- 도서관, 수영장, 식당 등의 이용 안내문
- 운영시간, 규칙, 요금 등 구체적 정보 제시
- 안내문 내용과 일치하는 것 찾기
- 실제 TOPIK 스타일의 실용문`,
      long: `장문 독해 문제를 생성하세요.
- 5-8문장의 긴 글 읽기
- 글의 내용 이해 및 세부 정보 파악
- 필자의 의도, 목적, 주장 파악
- 내용 일치/불일치 문제`,
    },
  };

  const levelGuideline = TOPIK_LEVEL_GUIDELINES[topikLevel] || TOPIK_LEVEL_GUIDELINES["1-2"];

  const prompt = `당신은 TOPIK(한국어능력시험) 전문 출제위원입니다.

다음 참고 자료를 바탕으로 ${count}개의 고품질 문제를 생성하세요:

[참고 자료]
${ragContent}

[문제 유형]
${typePrompts[type]?.[tabType] || "읽기 이해 문제"}

${levelGuideline}

⚠️ 중요: 반드시 위의 TOPIK ${topikLevel}급 가이드라인에 맞는 어휘와 문법만 사용하세요!
- ${topikLevel}급 학습자가 이해할 수 있는 수준으로 작성
- 해당 급수의 문법 패턴과 어휘 범위 내에서 출제
- 지문 길이와 복잡도도 급수에 맞게 조절

[필수 요구사항]
1. 각 문제는 반드시 다음 JSON 형식:
{
  "id": 숫자,
  "passage": "지문 또는 문장",
  "question": "질문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "answer": 정답인덱스(0-3),
  "explanationKo": "한국어 해설 (정답 설명 + 오답 분석)",
  "explanationVi": "베트남어 해설 (정답 설명 + 오답 분석)"
}

2. 해설 형식 (매우 중요!):
- 첫 줄: "정답: ① 선택지" 형식
- 2-3줄: 왜 정답인지 자세히 설명
- "오답 분석:" 섹션에서 나머지 선택지가 틀린 이유 설명
- 베트남어 해설도 동일한 구조

3. 베트남어 해설은 한국어 해설을 정확히 번역하되, 베트남 학습자에게 도움되는 추가 설명 포함

4. 각 문제는 TOPIK ${topikLevel}급 난이도에 정확히 맞출 것

반드시 JSON 배열만 반환하세요. 다른 텍스트 없이 순수 JSON만 출력하세요.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // JSON 추출
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }
  
  return [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'readingA', tabType = 'grammar', topikLevel = '1-2', count = 5, skipCache = false } = await req.json();
    
    console.log(`📚 Reading Content: type=${type}, tab=${tabType}, level=${topikLevel}, count=${count}`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!openAIApiKey || !geminiApiKey) {
      console.error('Missing API keys');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API keys not configured',
        questions: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 키 생성 (topikLevel 포함)
    const cacheKey = `reading_${type}_${tabType}_${topikLevel}_${count}`;
    
    // 캐시 확인 (skipCache가 false일 때만)
    if (!skipCache) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'reading-content')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`⚡ Cache HIT for ${cacheKey}`);
        // 캐시 히트 카운트 증가
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        
        return new Response(JSON.stringify({
          success: true,
          questions: cached.response,
          type,
          tabType,
          source: 'cache',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`💨 Cache MISS for ${cacheKey}`);
    }

    // 탭에 맞는 쿼리 선택
    const queries = TAB_QUERIES[type]?.[tabType] || TAB_QUERIES.readingA.grammar;
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    
    console.log(`🔍 Search query: "${randomQuery}"`);

    // 1. 임베딩 생성
    const queryEmbedding = await generateEmbedding(randomQuery, openAIApiKey);

    // 2. 벡터 검색
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
        match_count: RAG_CONFIG.MATCH_COUNT,
      }
    );

    if (searchError) {
      throw new Error(`Search failed: ${searchError.message}`);
    }

    console.log(`📊 Found ${searchResults?.length || 0} candidates`);

    let ragContent = '';
    
    if (searchResults && searchResults.length > 0) {
      // 3. Cohere Rerank
      let finalResults = searchResults;
      if (cohereApiKey) {
        finalResults = await rerankResults(randomQuery, searchResults, cohereApiKey, RAG_CONFIG.TOP_N);
      } else {
        finalResults = searchResults.slice(0, RAG_CONFIG.TOP_N);
      }

      ragContent = finalResults.map((r: any) => r.content).join('\n\n---\n\n');
      console.log(`✅ RAG content prepared: ${ragContent.length} chars`);
    } else {
      ragContent = `한국어 ${tabType} 관련 일반적인 학습 내용`;
    }

    // 4. Gemini로 문제 생성
    const questions = await generateQuestions(type, tabType, ragContent, count, geminiApiKey, topikLevel);

    console.log(`✨ Generated ${questions.length} questions`);

    // 5. 캐시에 저장 (1시간 유효)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'reading-content',
      response: questions,
      request_params: { type, tabType, topikLevel, count },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });
    console.log(`💾 Cached result for ${cacheKey} (TOPIK ${topikLevel})`);

    return new Response(JSON.stringify({
      success: true,
      questions,
      type,
      tabType,
      topikLevel,
      query: randomQuery,
      source: 'generated',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Reading content error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      questions: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
