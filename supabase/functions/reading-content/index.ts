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

  "5-6": `[TOPIK 5-6급 난이도 가이드라인 - 고급 수준 필수]

⚠️ 반드시 아래 고급 요소들을 포함해야 합니다!

어휘 (필수 사용):
- 고급 어휘 6000개 이상 수준
- 학술/전문 용어: 지속가능성, 패러다임, 인프라, 메커니즘, 양극화, 담론, 인식, 본질, 핵심
- 추상적 개념: 본질, 함의, 맥락, 전제, 귀결, 타당성, 현상, 관점, 논거
- 관용 표현: 물의를 일으키다, 난항을 겪다, 시사하는 바가 크다, 귀추가 주목되다
- 한자 성어: 전화위복, 이심전심, 고진감래, 사면초가, 백문불여일견
- 속담: 빈 수레가 요란하다, 우물 안 개구리, 소 잃고 외양간 고치다

문법 (반드시 2개 이상 사용):
- 고급 연결어미: -는 바람에, -은/는 나머지, -거니와, -건대, -더니만
- 추측/양보: -을지언정, -을망정, -기로서니
- 인용/전달: -다는 점에서, -다고는 하나, -느니만큼
- 복합 표현: -다시피 하다, -는 셈이다, -기 마련이다, -ㄹ 수밖에 없다
- 문어체 표현: -노라, -건마는, -으리라
- 담화 표지어: 그러니까, 아무튼, 어쨌거나, 결론적으로, 달리 말하면

지문 스타일 (필수):
- 최소 5-8문장의 학술적/분석적 지문
- 신문 사설, 학술 논문, 비평문 스타일
- 논리적 구조: 주장-근거-반론-결론
- 복잡한 문장 구조와 수식어구

주제 (고급 주제만):
- 사회 이슈: 환경 정책, 세대 갈등, 디지털 격차, 고령화 사회, 양극화
- 경제/산업: 고용 시장, 기업 윤리, 경제 전망, 산업 구조
- 문화/학술: 한류 산업, 교육 정책, 연구 동향, 미디어 비평, 문화 다양성
- 철학/사회: 정체성, 인권, 민주주의, 사회 정의

예시 지문:
"이러한 현상의 본질을 파악하기 위해서는 다각적인 분석이 필요하다. 단순히 표면적인 수치만을 놓고 판단하기보다는, 그 이면에 존재하는 구조적 요인들을 면밀히 검토해야 할 것이다. 일각에서는 이러한 접근이 지나치게 이상적이라는 비판이 제기되고 있으나, 장기적인 관점에서 볼 때 그 타당성을 부정하기 어렵다."`,
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

  // 5-6급일 때 더 강력한 지시
  const levelEnforcement = topikLevel === "5-6" 
    ? `
🚨 [필수 준수 사항 - TOPIK 5-6급]
1. 절대 기초 어휘나 단순한 일상 주제 금지!
2. 반드시 학술적/사회적 고급 주제로 지문 구성
3. 최소 5문장 이상의 심층적 지문
4. 고급 문법 표현 2개 이상 필수 포함
5. 논리적 구조 (주장-근거-반론-결론) 포함

[필수 선택 주제 - 반드시 이 중에서 선택]
1. 환경 정책과 지속가능한 발전
2. 디지털 격차와 정보 접근성 문제
3. 고령화 사회와 복지 정책 방향
4. 한류 산업의 경제적·문화적 파급 효과
5. AI 기술 발전과 일자리 변화
6. 세대 간 갈등과 소통의 문제
7. 도시화와 지역 균형 발전

[금지 사항]
❌ "날씨가 좋습니다", "저는 학생입니다" 같은 초급 문장 금지
❌ 단순 정보 전달 지문 금지
❌ 2-3문장 짧은 지문 금지

[필수 포함]
✅ 고급 어휘: 양극화, 패러다임, 지속가능성, 함의, 본질, 논거 등
✅ 고급 문법: -다고는 하나, -을지언정, -기 마련이다, -는 바람에 등
✅ 학술적/분석적 문체
`
    : "";

  const prompt = topikLevel === "5-6"
    ? `당신은 TOPIK(한국어능력시험) 전문 출제위원입니다.

🚨 중요: 반드시 TOPIK 5-6급 수준의 고급 문제만 생성하세요!

아래 참고 자료는 무시하고, 다음 고급 주제 중 하나를 선택해서 ${count}개의 고품질 읽기 문제를 생성하세요.

[문제 유형]
${typePrompts[type]?.[tabType] || "읽기 이해 문제"}

${levelGuideline}

${levelEnforcement}

[필수 요구사항]
1. 각 문제는 반드시 다음 JSON 형식:
{
  "id": 숫자,
  "passage": "지문 또는 문장 (최소 5문장의 고급 학술 지문)",
  "question": "질문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
  "answer": 정답인덱스(0-3),
  "explanationKo": "한국어 해설 (정답 설명 + 오답 분석)",
  "explanationVi": "베트남어 해설 (정답 설명 + 오답 분석)"
}

2. 해설 형식:
- 첫 줄: "정답: ① 선택지" 형식
- 2-3줄: 왜 정답인지 자세히 설명
- "오답 분석:" 섹션에서 나머지 선택지가 틀린 이유 설명

반드시 JSON 배열만 반환하세요.`
    : `당신은 TOPIK(한국어능력시험) 전문 출제위원입니다.

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

  const xaiApiKey = Deno.env.get('X_AI_API_KEY');
  if (!xaiApiKey) {
    throw new Error('X_AI_API_KEY not configured');
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${xaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4.1-fast-non-reasoning',
      messages: [
        {
          role: 'system',
          content: `당신은 TOPIK ${topikLevel}급 읽기 문제 생성 전문가입니다. 반드시 JSON 배열 형식으로만 응답하세요.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: topikLevel === "5-6" ? 0.7 : 0.8,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('xAI API error:', response.status, errText);
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
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

    let ragContent = '';
    let randomQuery = '';

    // 5-6급은 RAG 없이 직접 고급 주제로 생성
    if (topikLevel === "5-6") {
      console.log(`🎯 TOPIK 5-6: Skipping RAG, using advanced topics directly`);
      ragContent = ""; // RAG 없이 프롬프트의 고급 주제 사용
    } else {
      // 1-2급, 3-4급은 RAG 사용
      const queries = TAB_QUERIES[type]?.[tabType] || TAB_QUERIES.readingA.grammar;
      randomQuery = queries[Math.floor(Math.random() * queries.length)];
      
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
      source: topikLevel === "5-6" ? 'direct' : 'generated',
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
