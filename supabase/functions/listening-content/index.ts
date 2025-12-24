import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RAG 설정
const RAG_CONFIG = {
  MATCH_THRESHOLD: 0.2,
  MATCH_COUNT: 30,
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 10,
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// 검색 쿼리 - 듣기 문제용
const SEARCH_QUERIES = [
  "한국어 듣기 회화 대화",
  "TOPIK 듣기 문제 예시",
  "한국어 일상 대화 표현",
  "한국어 질문 대답 패턴",
  "한국 생활 상황 대화",
  "한국어 문법 예문 회화",
];

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
  "1-2": `[TOPIK 1-2급 듣기 가이드라인]
어휘:
- 기초 어휘 800~1500개 범위
- 일상생활 필수 단어 (가족, 음식, 날씨, 시간, 장소 등)
- 기본 동사/형용사: 가다, 오다, 먹다, 마시다, 좋다 등

문법:
- 기본 조사: 이/가, 을/를, 은/는, 에, 에서
- 기본 어미: -습니다/-ㅂ니다, -아요/-어요
- 간단한 연결어미: -고, -아서/-어서
- 시제: 현재, 과거 (-았/었-)

대화 스타일:
- 2-3문장의 짧은 대화
- 단순 질문-대답 형식
- 일상 인사, 물건 구매, 장소 묻기
- 천천히, 명확한 발음

예시:
- "안녕하세요. 학교에 가요?"
- "네, 학교에 가요."`,

  "3-4": `[TOPIK 3-4급 듣기 가이드라인]
어휘:
- 중급 어휘 3000~5000개 범위
- 사회생활 관련 어휘 (직장, 교육, 건강, 환경)
- 한자어 및 관용 표현

문법:
- 복합 조사: 에게, 한테, 께
- 연결어미: -으니까, -지만, -으면서, -다가
- 간접 인용: -다고 하다
- 피동/사동 표현

대화 스타일:
- 3-4문장의 대화
- 의견 제시, 설명, 권유
- 직장, 학교, 공공장소 상황
- 자연스러운 속도

예시:
- "요즘 운동을 시작했다고 들었는데, 어떤 운동 하세요?"
- "네, 수영을 배우고 있어요. 건강에도 좋고 스트레스도 풀려요."`,

  "5-6": `[TOPIK 5-6급 듣기 가이드라인]
어휘:
- 고급 어휘 6000개 이상
- 전문 용어 및 학술 어휘
- 관용어, 속담, 사자성어

문법:
- 고급 연결어미: -는 바람에, -은 나머지, -거니와
- 문어체 표현: -노라, -도다, -으리라
- 복합 표현: -다시피 하다, -는 셈이다
- 담화 표지어: 그러니까, 어쨌든, 결국

대화 스타일:
- 4-6문장의 복잡한 대화
- 논쟁, 토론, 분석적 대화
- 뉴스, 강연, 인터뷰 스타일
- 빠른 속도, 자연스러운 축약

예시:
- "이 문제에 대해 전문가들 사이에서도 의견이 분분한데요, 교수님께서는 어떻게 보십니까?"
- "글쎄요, 일리가 있다고 하더라도 현실적인 한계를 간과할 수는 없을 것 같습니다."`,
};

interface Question {
  type: "single" | "dialogue";
  speaker1Text?: string;
  speaker2Text?: string;
  singleText?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  explanationVi: string;
}

// AI를 사용해 RAG 결과에서 듣기 문제 생성
async function generateListeningQuestions(
  ragContent: string,
  count: number,
  geminiApiKey: string,
  topikLevel: string = "1-2"
): Promise<Question[]> {
  const levelGuideline = TOPIK_LEVEL_GUIDELINES[topikLevel] || TOPIK_LEVEL_GUIDELINES["1-2"];
  const systemPrompt = `당신은 TOPIK 스타일의 한국어 듣기 문제 생성기입니다.
주어진 텍스트를 참고하여 한국어 학습자를 위한 듣기 문제를 생성합니다.

## 문제 유형
1. dialogue (대화): 두 사람의 짧은 대화 + 질문 + 4지선다
2. single (단일): 한 사람의 발화/안내 + 질문 + 4지선다

## 생성 규칙
- 문제는 실생활에서 자주 접하는 상황
- 질문은 내용 이해도를 측정
- 선택지는 4개, 정답은 하나
- 해설은 한국어와 베트남어로 제공

${levelGuideline}

⚠️ 중요: 반드시 위의 TOPIK ${topikLevel}급 가이드라인에 맞는 어휘, 문법, 대화 스타일로 작성하세요!

## 응답 형식 (JSON 배열만)
[
  {
    "type": "dialogue",
    "speaker1Text": "첫 번째 화자 대사",
    "speaker2Text": "두 번째 화자 대사",
    "question": "질문",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "answer": 0,
    "explanation": "한국어 해설 (정답: ① 선택지명으로 시작)",
    "explanationVi": "Giải thích tiếng Việt"
  }
]`;

  const userPrompt = `다음 텍스트를 참고하여 TOPIK ${topikLevel}급 수준의 ${count}개 듣기 문제를 생성해주세요.
대화형(dialogue)과 단일형(single)을 적절히 섞어주세요.
반드시 ${topikLevel}급에 맞는 어휘와 문법만 사용하세요.

참고 텍스트:
${ragContent}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // JSON 파싱
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return [];
}

// 폴백 문제
const FALLBACK_QUESTIONS: Question[] = [
  {
    type: "dialogue",
    speaker1Text: "안녕하세요. 뭘 찾으세요?",
    speaker2Text: "네, 사과 있어요?",
    question: "이 대화는 어디에서 하고 있습니까?",
    options: ["병원", "학교", "가게", "도서관"],
    answer: 2,
    explanation: "과일을 찾는 대화이므로 가게입니다.",
    explanationVi: "Đây là cuộc hội thoại tìm trái cây nên là cửa hàng."
  },
  {
    type: "single",
    singleText: "오늘 오후 3시에 회의가 있습니다. 회의실은 5층입니다.",
    question: "회의실은 몇 층에 있습니까?",
    options: ["3층", "4층", "5층", "6층"],
    answer: 2,
    explanation: "회의실은 5층이라고 했습니다.",
    explanationVi: "Phòng họp ở tầng 5."
  },
  {
    type: "dialogue",
    speaker1Text: "주말에 뭐 할 거예요?",
    speaker2Text: "친구하고 영화 볼 거예요.",
    question: "여자는 주말에 무엇을 할 거예요?",
    options: ["운동할 거예요", "영화 볼 거예요", "공부할 거예요", "여행 갈 거예요"],
    answer: 1,
    explanation: "친구하고 영화를 볼 거라고 했습니다.",
    explanationVi: "Cô ấy nói sẽ xem phim với bạn."
  },
  {
    type: "dialogue",
    speaker1Text: "이 버스 명동 가요?",
    speaker2Text: "아니요, 다음 버스 타세요.",
    question: "남자는 어떻게 해야 합니까?",
    options: ["이 버스를 타야 해요", "다음 버스를 타야 해요", "지하철을 타야 해요", "택시를 타야 해요"],
    answer: 1,
    explanation: "여자가 다음 버스를 타라고 했습니다.",
    explanationVi: "Người phụ nữ nói hãy đợi chuyến xe buýt tiếp theo."
  },
  {
    type: "single",
    singleText: "내일 아침 8시에 학교 앞에서 만나요. 늦지 마세요.",
    question: "내일 몇 시에 만납니까?",
    options: ["7시", "8시", "9시", "10시"],
    answer: 1,
    explanation: "아침 8시에 만나자고 했습니다.",
    explanationVi: "Họ sẽ gặp nhau lúc 8 giờ sáng."
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const count: number = body.count ?? 5;
    const topikLevel: string = body.topikLevel ?? "1-2";
    const skipCache: boolean = body.skipCache ?? false;
    
    console.log(`🎧 Listening Content: level=${topikLevel}, count=${count}`);
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIApiKey || !geminiApiKey) {
      console.log('⚠️ API keys missing, using fallback content');
      return new Response(JSON.stringify({ 
        success: true, 
        questions: FALLBACK_QUESTIONS.slice(0, count),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 캐시 키 생성 (topikLevel 포함)
    const cacheKey = `listening_${topikLevel}_${count}`;
    
    // 캐시 확인 (skipCache가 false일 때만)
    if (!skipCache) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('function_name', 'listening-content')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`⚡ Cache HIT for ${cacheKey}`);
        await supabase.rpc('increment_cache_hit', { p_id: cached.id });
        
        return new Response(JSON.stringify({
          success: true,
          questions: cached.response,
          source: 'cache',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log(`💨 Cache MISS for ${cacheKey}`);
    }

    console.log(`📝 Generating ${count} listening questions for TOPIK ${topikLevel}`);

    // 1. 랜덤 검색 쿼리 선택
    const randomQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    console.log(`🔍 Search query: "${randomQuery}"`);

    // 2. 임베딩 생성 및 RAG 검색
    const embedding = await generateEmbedding(randomQuery, openAIApiKey);
    
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${embedding.join(',')}]`,
        match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
        match_count: RAG_CONFIG.MATCH_COUNT,
      }
    );

    if (searchError || !searchResults || searchResults.length === 0) {
      console.log('⚠️ No RAG results, using fallback');
      return new Response(JSON.stringify({ 
        success: true, 
        questions: FALLBACK_QUESTIONS.slice(0, count),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📚 Found ${searchResults.length} candidates`);

    // 3. Cohere Rerank (선택적)
    let rankedResults = searchResults;
    if (cohereApiKey) {
      rankedResults = await rerankResults(randomQuery, searchResults, cohereApiKey, RAG_CONFIG.TOP_N);
      console.log(`🔄 Reranked to ${rankedResults.length} results`);
    } else {
      rankedResults = searchResults.slice(0, RAG_CONFIG.TOP_N);
    }

    // 4. RAG 콘텐츠 결합
    const ragContent = rankedResults.map((r: any) => r.content).join('\n\n');
    console.log(`📖 Combined content: ${ragContent.length} chars`);

    // 5. AI로 듣기 문제 생성
    const generatedQuestions = await generateListeningQuestions(ragContent, count, geminiApiKey);
    console.log(`✅ Generated ${generatedQuestions.length} questions`);

    // 부족하면 폴백 추가
    let finalQuestions = generatedQuestions;
    if (finalQuestions.length < count) {
      const additional = FALLBACK_QUESTIONS.slice(0, count - finalQuestions.length);
      finalQuestions = [...finalQuestions, ...additional];
    }

    // 6. 캐시에 저장 (1시간 유효)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'listening-content',
      response: finalQuestions.slice(0, count),
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });
    console.log(`💾 Cached result for ${cacheKey} (TOPIK ${topikLevel})`);

    return new Response(JSON.stringify({ 
      success: true, 
      questions: finalQuestions.slice(0, count),
      topikLevel,
      source: 'rag',
      query: randomQuery,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Listening content error:', error);
    
    // 에러 시 폴백
    return new Response(JSON.stringify({ 
      success: true, 
      questions: FALLBACK_QUESTIONS,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
