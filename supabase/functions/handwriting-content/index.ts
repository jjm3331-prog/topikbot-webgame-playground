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

// 검색 쿼리 템플릿
const SEARCH_QUERIES = {
  words: [
    "한국어 기초 단어 어휘",
    "일상생활 한국어 단어",
    "TOPIK 필수 어휘",
    "한국어 명사 동사 형용사",
    "한국어 학습 기본 단어",
  ],
  sentences: [
    "한국어 기초 문장 회화",
    "일상생활 한국어 표현",
    "한국어 문법 예문",
    "TOPIK 읽기 문장",
    "한국어 쓰기 연습 문장",
  ],
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

// AI를 사용해 RAG 결과에서 단어/문장 추출
async function extractContent(
  type: 'words' | 'sentences',
  ragContent: string,
  count: number,
  exclude: string[],
  geminiApiKey: string
): Promise<{ korean: string; vietnamese: string }[]> {
  const systemPrompt = type === 'words' 
    ? `당신은 한국어 학습 콘텐츠 추출기입니다.
주어진 텍스트에서 손글씨 연습에 적합한 한국어 단어를 추출합니다.

## 규칙
- 2-6글자 단어 선호
- 일상적이고 실용적인 단어
- 다양한 받침 포함 (ㄱ, ㄴ, ㄹ, ㅁ, ㅂ, ㅇ 등)
- 제외 목록의 단어는 포함하지 않음

## 응답 형식 (JSON 배열만)
[{"korean": "한국어", "vietnamese": "Tiếng Hàn"}, ...]`
    : `당신은 한국어 학습 콘텐츠 추출기입니다.
주어진 텍스트에서 손글씨 연습에 적합한 한국어 문장을 추출합니다.

## 규칙
- 5-15글자 문장 선호
- 문법적으로 완성된 문장
- 일상적이고 실용적인 표현
- 다양한 문법 패턴 포함
- 제외 목록의 문장은 포함하지 않음

## 응답 형식 (JSON 배열만)
[{"korean": "안녕하세요", "vietnamese": "Xin chào"}, ...]`;

  const userPrompt = `다음 텍스트에서 ${count}개의 ${type === 'words' ? '단어' : '문장'}를 추출해주세요.

제외할 항목: ${exclude.length > 0 ? exclude.join(', ') : '없음'}

텍스트:
${ragContent}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
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

// 폴백 콘텐츠
const FALLBACK_WORDS = [
  { korean: "한국어", vietnamese: "Tiếng Hàn" },
  { korean: "공부", vietnamese: "Học tập" },
  { korean: "연습", vietnamese: "Luyện tập" },
  { korean: "사랑", vietnamese: "Tình yêu" },
  { korean: "행복", vietnamese: "Hạnh phúc" },
  { korean: "친구", vietnamese: "Bạn bè" },
  { korean: "가족", vietnamese: "Gia đình" },
  { korean: "음식", vietnamese: "Đồ ăn" },
  { korean: "여행", vietnamese: "Du lịch" },
  { korean: "문화", vietnamese: "Văn hóa" },
];

const FALLBACK_SENTENCES = [
  { korean: "안녕하세요", vietnamese: "Xin chào" },
  { korean: "감사합니다", vietnamese: "Cảm ơn" },
  { korean: "사랑해요", vietnamese: "Anh/Em yêu bạn" },
  { korean: "오늘 날씨가 좋아요", vietnamese: "Hôm nay thời tiết đẹp" },
  { korean: "한국어를 공부해요", vietnamese: "Tôi học tiếng Hàn" },
  { korean: "맛있게 드세요", vietnamese: "Chúc ngon miệng" },
  { korean: "잘 지내세요?", vietnamese: "Bạn khỏe không?" },
  { korean: "좋은 하루 되세요", vietnamese: "Chúc bạn một ngày tốt lành" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  type ContentType = 'words' | 'sentences';

  try {
    const body = await req.json();
    const type: ContentType = body.type === 'sentences' ? 'sentences' : 'words';
    const count: number = body.count ?? 10;
    const exclude: string[] = body.exclude ?? [];
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const cohereApiKey = Deno.env.get('COHERE_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIApiKey || !geminiApiKey) {
      console.log('⚠️ API keys missing, using fallback content');
      const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
      const filtered = fallback.filter(item => !exclude.includes(item.korean));
      return new Response(JSON.stringify({ 
        success: true, 
        content: filtered.slice(0, count),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📝 Generating ${count} ${type} for handwriting practice`);

    // 1. 랜덤 검색 쿼리 선택
    const queries = SEARCH_QUERIES[type];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
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
      const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
      const filtered = fallback.filter(item => !exclude.includes(item.korean));
      return new Response(JSON.stringify({ 
        success: true, 
        content: filtered.slice(0, count),
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

    // 5. AI로 단어/문장 추출
    const extractedContent = await extractContent(type, ragContent, count + 5, exclude, geminiApiKey);
    console.log(`✅ Extracted ${extractedContent.length} items`);

    // 제외 목록 필터링 후 반환
    const finalContent = extractedContent
      .filter(item => !exclude.includes(item.korean))
      .slice(0, count);

    // 부족하면 폴백 추가
    if (finalContent.length < count) {
      const fallback = type === 'words' ? FALLBACK_WORDS : FALLBACK_SENTENCES;
      const additional = fallback
        .filter(item => !exclude.includes(item.korean) && !finalContent.some(c => c.korean === item.korean))
        .slice(0, count - finalContent.length);
      finalContent.push(...additional);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      content: finalContent,
      source: 'rag',
      query: randomQuery,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Handwriting content error:', error);
    
    // 에러 시 폴백
    const fallback = FALLBACK_WORDS.slice(0, 10);
    return new Response(JSON.stringify({ 
      success: true, 
      content: fallback,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
