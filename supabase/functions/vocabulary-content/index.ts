import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🎯 RAG 설정 - 보수적 threshold
// ============================================
const RAG_CONFIG = {
  MATCH_THRESHOLD: 0.6,
  MATCH_COUNT: 20,
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 5,
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// ============================================
// 🔥 급수별 Few-shot 예시 프롬프트
// ============================================
const TOPIK_VOCAB_EXAMPLES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 어휘 예시]

{
  "id": 1,
  "korean": "가족",
  "meaning": "gia đình",
  "pronunciation": "가족 [가족]",
  "example": "우리 가족은 네 명이에요.",
  "exampleMeaning": "Gia đình tôi có bốn người."
}

{
  "id": 2,
  "korean": "사과",
  "meaning": "táo (quả)",
  "pronunciation": "사과 [사과]",
  "example": "사과 두 개 주세요.",
  "exampleMeaning": "Cho tôi hai quả táo."
}

{
  "id": 3,
  "korean": "학교",
  "meaning": "trường học",
  "pronunciation": "학교 [학꾜]",
  "example": "저는 학교에 가요.",
  "exampleMeaning": "Tôi đi đến trường."
}

[어휘 범위]
- 기초 생활 어휘 800~1500개
- 카테고리: 가족, 음식, 날씨, 시간, 장소, 쇼핑, 교통`,

  "3-4": `[TOPIK 3-4급 어휘 예시]

{
  "id": 1,
  "korean": "경험",
  "meaning": "kinh nghiệm, trải nghiệm",
  "pronunciation": "경험 [경험]",
  "example": "이번 인턴십은 좋은 경험이었어요.",
  "exampleMeaning": "Kỳ thực tập này là một trải nghiệm tốt."
}

{
  "id": 2,
  "korean": "환경",
  "meaning": "môi trường",
  "pronunciation": "환경 [환경]",
  "example": "환경을 보호해야 합니다.",
  "exampleMeaning": "Chúng ta phải bảo vệ môi trường."
}

{
  "id": 3,
  "korean": "관계",
  "meaning": "quan hệ, mối quan hệ",
  "pronunciation": "관계 [관계/관게]",
  "example": "인간관계가 중요해요.",
  "exampleMeaning": "Mối quan hệ giữa người với người rất quan trọng."
}

[어휘 범위]
- 중급 어휘 3000~5000개
- 카테고리: 직장, 건강, 환경, 교육, 경제, 사회`,

  "5-6": `[TOPIK 5-6급 어휘 예시]

{
  "id": 1,
  "korean": "담론",
  "meaning": "diễn ngôn, luận thuyết",
  "pronunciation": "담론 [담논]",
  "example": "이 논문은 페미니즘 담론을 다루고 있다.",
  "exampleMeaning": "Bài luận này đề cập đến diễn ngôn nữ quyền."
}

{
  "id": 2,
  "korean": "양극화",
  "meaning": "sự phân cực, lưỡng cực hóa",
  "pronunciation": "양극화 [양극화]",
  "example": "경제적 양극화가 심화되고 있다.",
  "exampleMeaning": "Sự phân cực kinh tế đang ngày càng trầm trọng."
}

{
  "id": 3,
  "korean": "패러다임",
  "meaning": "mô hình, paradigm",
  "pronunciation": "패러다임 [패러다임]",
  "example": "디지털 시대는 새로운 패러다임을 요구한다.",
  "exampleMeaning": "Thời đại số đòi hỏi một mô hình mới."
}

{
  "id": 4,
  "korean": "지속가능성",
  "meaning": "tính bền vững",
  "pronunciation": "지속가능성 [지속가능성]",
  "example": "지속가능성은 현대 기업의 핵심 가치다.",
  "exampleMeaning": "Tính bền vững là giá trị cốt lõi của doanh nghiệp hiện đại."
}

[어휘 범위]
- 고급 어휘 6000개 이상
- 카테고리: 학술, 정치, 경제, 사회 이슈, 전문 용어`
};

const SYSTEM_PROMPT = `당신은 TOPIK 어휘 교육 전문가입니다.
대상: 베트남인 학습자

[핵심 규칙]
1. 출력은 오직 JSON 배열만 (마크다운 금지)
2. 베트남어는 번역투 금지, 현지인이 쓰는 자연스러운 표현
3. 급수별 어휘 수준을 엄격히 준수
4. 예문은 해당 급수 학습자가 이해할 수 있는 수준

[JSON 스키마]
{
  "id": number,
  "korean": "한국어 단어",
  "meaning": "베트남어 뜻",
  "pronunciation": "발음 [발음]",
  "example": "예문 (한국어)",
  "exampleMeaning": "예문 번역 (베트남어)"
}`;

const VOCAB_CATEGORIES: Record<string, string[]> = {
  "1-2": ["가족과 관계", "음식과 요리", "날씨와 계절", "쇼핑과 물건", "교통과 장소"],
  "3-4": ["직장과 업무", "건강과 의료", "환경과 사회", "교육과 학습", "경제와 금융"],
  "5-6": ["정치와 사회", "과학과 기술", "문화와 예술", "경제와 산업", "학술과 연구"],
};

// OpenAI 임베딩
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

  if (!response.ok) throw new Error(`OpenAI embedding error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding;
}

// Cohere Rerank
async function rerankResults(query: string, documents: any[], apiKey: string, topN: number): Promise<any[]> {
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

  if (!response.ok) return documents.slice(0, topN);

  const data = await response.json();
  return data.results.map((r: any) => ({
    ...documents[r.index],
    rerank_score: r.relevance_score,
  }));
}

// RAG 검색
async function searchRAG(query: string, supabase: any, openAIKey: string, cohereKey: string | undefined): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query, openAIKey);

    const { data: results, error } = await supabase.rpc('search_knowledge', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
      match_count: RAG_CONFIG.MATCH_COUNT,
    });

    if (error || !results || results.length === 0) {
      console.log('[Vocab] RAG: No results');
      return [];
    }

    let finalResults = results;
    if (cohereKey) {
      finalResults = await rerankResults(query, results, cohereKey, RAG_CONFIG.TOP_N);
    }

    return finalResults.filter((r: any) => (r.rerank_score ?? r.similarity) >= 0.5).map((r: any) => r.content);
  } catch (error) {
    console.error('[Vocab] RAG failed:', error);
    return [];
  }
}

// LLM Fallback - Gemini 2.5 Flash Lite
async function generateWithLLM(count: number, topikLevel: string, category: string, ragContext: string[]): Promise<any[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const levelExamples = TOPIK_VOCAB_EXAMPLES[topikLevel] || TOPIK_VOCAB_EXAMPLES["1-2"];

  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\n[참고 자료]\n${ragContext.join('\n\n')}`;
  }

  const userPrompt = `${levelExamples}${contextSection}

"${category}" 카테고리에서 TOPIK ${topikLevel}급 수준 어휘 ${count}개를 JSON 배열로 생성하세요.
반드시 예시와 동일한 품질을 유지하세요.`;

  console.log(`[Vocab] LLM: ${count} words for TOPIK ${topikLevel}, category: ${category}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Vocab] Gemini error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.words || parsed.data || [];
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse vocabulary JSON");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topikLevel = body.level || "1-2";
    const count = Math.min(Math.max(body.count || 10, 1), 30);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const cohereKey = Deno.env.get('COHERE_API_KEY');

    const categories = VOCAB_CATEGORIES[topikLevel] || VOCAB_CATEGORIES["1-2"];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // 캐시 확인 (v2)
    const cacheKey = `vocab_v2_${topikLevel}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'vocabulary-content')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`[Vocab] Cache HIT: ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        words: cached.response,
        topikLevel,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Vocab] Generating ${count} words for TOPIK ${topikLevel}`);

    // 1. RAG 검색
    let ragContext: string[] = [];
    if (openAIKey) {
      const ragQuery = `TOPIK ${topikLevel}급 어휘 ${randomCategory}`;
      ragContext = await searchRAG(ragQuery, supabase, openAIKey, cohereKey);
    }

    // 2. LLM 생성
    const words = await generateWithLLM(count, topikLevel, randomCategory, ragContext);

    // 캐시 저장
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'vocabulary-content',
      response: words,
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      words,
      topikLevel,
      source: ragContext.length > 0 ? 'rag+llm' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Vocab] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
