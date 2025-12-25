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
  MATCH_THRESHOLD: 0.6,       // 보수적 threshold (0.6 이상만)
  MATCH_COUNT: 20,            // 후보 풀
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 5,                   // 최종 문서 수
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

// ============================================
// 🔥 급수별 Few-shot 예시 프롬프트 (핵심!)
// ============================================
const TOPIK_LEVEL_EXAMPLES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 듣기 예시]

<예시1 - 대화형>
{
  "type": "dialogue",
  "speaker1Text": "여보세요? 김민수 씨 있어요?",
  "speaker2Text": "아니요, 지금 밖에 나갔어요. 메시지 남기실래요?",
  "question": "남자는 왜 전화했습니까?",
  "options": ["김민수 씨를 만나려고", "메시지를 남기려고", "전화번호를 물으려고", "집에 가려고"],
  "answer": 0,
  "explanation": "'김민수 씨 있어요?'라고 물었으므로 김민수 씨를 찾기 위해 전화한 것입니다.",
  "explanationVi": "Người đàn ông hỏi 'Kim Minsu có ở đó không?' nên anh ấy gọi để tìm Kim Minsu."
}

<예시2 - 안내형>
{
  "type": "single",
  "speaker1Text": "지금부터 3번 출구는 공사 중입니다. 4번 출구를 이용해 주세요.",
  "question": "이 안내를 듣고 어디로 가야 합니까?",
  "options": ["1번 출구", "2번 출구", "3번 출구", "4번 출구"],
  "answer": 3,
  "explanation": "3번 출구가 공사 중이어서 4번 출구를 이용하라고 안내했습니다.",
  "explanationVi": "Vì cửa số 3 đang thi công nên được hướng dẫn sử dụng cửa số 4."
}

[필수 어휘/문법]
- 조사: 이/가, 을/를, 은/는, 에, 에서
- 어미: -아요/-어요, -습니다/-ㅂ니다
- 상황: 인사, 쇼핑, 길 묻기, 전화, 약속`,

  "3-4": `[TOPIK 3-4급 듣기 예시]

<예시1 - 대화형>
{
  "type": "dialogue",
  "speaker1Text": "요즘 회사 일이 너무 바빠서 운동할 시간이 없어요.",
  "speaker2Text": "저도 그래요. 그래서 출퇴근할 때 한 정거장 먼저 내려서 걸어요.",
  "question": "여자가 운동하는 방법은 무엇입니까?",
  "options": ["헬스장에 다닌다", "주말에 등산을 한다", "출퇴근 시 걸어 다닌다", "점심시간에 수영한다"],
  "answer": 2,
  "explanation": "한 정거장 먼저 내려서 걷는다고 했으므로 출퇴근 시 걷는 것이 운동 방법입니다.",
  "explanationVi": "Cô ấy nói xuống trước một trạm và đi bộ, nên cách tập thể dục là đi bộ khi đi làm."
}

<예시2 - 뉴스형>
{
  "type": "single",
  "speaker1Text": "최근 조사에 따르면 20대의 70%가 결혼보다 자기 계발을 더 중요하게 생각한다고 합니다. 전문가들은 경제적 불안과 개인주의 확산이 원인이라고 분석했습니다.",
  "question": "20대가 결혼을 미루는 이유는 무엇입니까?",
  "options": ["부모님 반대", "건강 문제", "경제적 불안과 개인주의", "주거 문제"],
  "answer": 2,
  "explanation": "전문가들이 경제적 불안과 개인주의 확산이 원인이라고 분석했습니다.",
  "explanationVi": "Các chuyên gia phân tích nguyên nhân là sự bất ổn kinh tế và sự lan rộng của chủ nghĩa cá nhân."
}

[필수 어휘/문법]
- 연결어미: -는데, -으면, -아서/어서, -지만
- 표현: -것 같다, -기로 하다, -게 되다
- 상황: 직장생활, 사회이슈, 뉴스, 인터뷰`,

  "5-6": `[TOPIK 5-6급 듣기 예시]

<예시1 - 학술 토론>
{
  "type": "dialogue",
  "speaker1Text": "인공지능의 발전이 노동시장에 미치는 영향에 대해 어떻게 생각하십니까? 일자리 감소를 우려하는 목소리가 큽니다.",
  "speaker2Text": "단기적으로는 일부 직종의 대체가 불가피하겠지만, 역사적으로 기술 혁신은 새로운 산업과 일자리를 창출해 왔습니다. 중요한 건 이 전환기에 적절한 재교육 시스템을 갖추는 것입니다.",
  "question": "남자의 주장으로 가장 적절한 것은 무엇입니까?",
  "options": ["AI 개발을 중단해야 한다", "재교육 시스템 구축이 중요하다", "모든 직종이 AI로 대체될 것이다", "기술 혁신은 항상 해롭다"],
  "answer": 1,
  "explanation": "전환기에 적절한 재교육 시스템을 갖추는 것이 중요하다고 강조했습니다.",
  "explanationVi": "Ông ấy nhấn mạnh việc xây dựng hệ thống đào tạo lại phù hợp trong giai đoạn chuyển đổi là quan trọng."
}

<예시2 - 강연형>
{
  "type": "single",
  "speaker1Text": "지속가능한 발전이라는 개념은 1987년 브룬트란트 보고서에서 처음 공식화되었습니다. 이는 미래 세대의 필요를 충족시킬 능력을 저해하지 않으면서 현재 세대의 필요를 충족시키는 발전을 의미합니다. 오늘날 이 개념은 환경, 경제, 사회의 세 축을 아우르는 통합적 접근으로 확장되었습니다.",
  "question": "강연의 중심 내용으로 가장 적절한 것은 무엇입니까?",
  "options": ["브룬트란트 보고서의 역사", "지속가능한 발전의 정의와 확장", "환경 문제의 심각성", "경제 발전의 필요성"],
  "answer": 1,
  "explanation": "지속가능한 발전의 정의(1987년)와 오늘날의 통합적 접근으로의 확장을 설명하고 있습니다.",
  "explanationVi": "Bài giảng giải thích định nghĩa phát triển bền vững (1987) và sự mở rộng thành cách tiếp cận tích hợp ngày nay."
}

[필수 어휘/문법]
- 문어체: -는 바, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도, -을지언정
- 학술용어: 지속가능성, 패러다임, 담론, 함의
- 상황: 학술 토론, 강연, 시사 분석, 전문가 인터뷰`
};

const SYSTEM_PROMPT = `당신은 TOPIK(한국어능력시험) 듣기 문제 출제 전문가입니다.
대상: 베트남인 학습자

[핵심 규칙]
1. 출력은 오직 JSON 배열만 (마크다운, 설명 금지)
2. 베트남어는 번역투 금지, 현지인이 쓰는 자연스러운 표현
3. 급수별 어휘/문법 수준을 엄격히 준수
4. 대화형(dialogue)과 안내/발표형(single) 적절히 혼합

[JSON 스키마]
{
  "type": "dialogue" | "single",
  "speaker1Text": "첫 번째 화자/발표자 (한국어)",
  "speaker2Text": "두 번째 화자 (dialogue만, 한국어)",
  "question": "질문 (한국어)",
  "options": ["①", "②", "③", "④"],
  "answer": 0-3,
  "explanation": "해설 (한국어)",
  "explanationVi": "Giải thích (tiếng Việt tự nhiên)"
}`;

interface Question {
  type: "dialogue" | "single";
  speaker1Text: string;
  speaker2Text?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  explanationVi: string;
}

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
    throw new Error(`OpenAI embedding error: ${response.status}`);
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
    console.error('Cohere rerank failed, using vector order');
    return documents.slice(0, topN);
  }

  const data = await response.json();
  return data.results.map((r: { index: number; relevance_score: number }) => ({
    ...documents[r.index],
    rerank_score: r.relevance_score,
  }));
}

// RAG 검색
async function searchRAG(
  query: string,
  supabase: any,
  openAIKey: string,
  cohereKey: string | undefined
): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query, openAIKey);

    const { data: results, error } = await supabase.rpc('search_knowledge', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
      match_count: RAG_CONFIG.MATCH_COUNT,
    });

    if (error || !results || results.length === 0) {
      console.log('[Listening] RAG: No results found');
      return [];
    }

    console.log(`[Listening] RAG: Found ${results.length} candidates`);

    // Rerank if Cohere key available
    let finalResults = results;
    if (cohereKey && results.length > 0) {
      finalResults = await rerankResults(query, results, cohereKey, RAG_CONFIG.TOP_N);
      console.log(`[Listening] Reranked to ${finalResults.length} docs`);
    }

    // Filter by rerank score (보수적: 0.5 이상만)
    const highQualityResults = finalResults.filter((r: any) => 
      (r.rerank_score ?? r.similarity) >= 0.5
    );

    return highQualityResults.map((r: any) => r.content);
  } catch (error) {
    console.error('[Listening] RAG search failed:', error);
    return [];
  }
}

// LLM Fallback - Gemini 2.5 Flash Lite (가장 빠름)
async function generateWithLLM(
  count: number,
  topikLevel: string,
  ragContext: string[]
): Promise<Question[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const levelExamples = TOPIK_LEVEL_EXAMPLES[topikLevel] || TOPIK_LEVEL_EXAMPLES["1-2"];
  
  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\n[참고 자료 - 이 내용을 바탕으로 문제 생성]\n${ragContext.join('\n\n')}`;
  }

  const userPrompt = `${levelExamples}${contextSection}

위 예시와 동일한 품질과 난이도로 TOPIK ${topikLevel}급 듣기 문제 ${count}개를 JSON 배열로 생성하세요.
반드시 예시의 어휘/문법 수준을 정확히 따르세요.`;

  console.log(`[Listening] LLM Fallback: Generating ${count} questions for TOPIK ${topikLevel}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          temperature: 0.3,  // 낮은 temperature로 정확성 향상
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Listening] Gemini error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.questions || [];
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(body.count || 5, 1), 20);
    const topikLevel = body.level || "1-2";

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const cohereKey = Deno.env.get('COHERE_API_KEY');

    // 캐시 확인 (버전 포함 - v2)
    const cacheKey = `listening_v2_${topikLevel}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'listening-content')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`[Listening] Cache HIT: ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        questions: cached.response,
        source: 'cache',
        topikLevel,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Listening] Generating ${count} questions for TOPIK ${topikLevel}`);

    // 1. RAG 검색 시도
    let ragContext: string[] = [];
    if (openAIKey) {
      const ragQuery = `TOPIK ${topikLevel}급 듣기 문제 대화 스크립트`;
      ragContext = await searchRAG(ragQuery, supabase, openAIKey, cohereKey);
      console.log(`[Listening] RAG context: ${ragContext.length} docs`);
    }

    // 2. LLM으로 문제 생성 (RAG 컨텍스트 활용 또는 순수 생성)
    const questions = await generateWithLLM(count, topikLevel, ragContext);
    console.log(`[Listening] Generated ${questions.length} questions`);

    // 캐시 저장 (4시간)
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'listening-content',
      response: questions.slice(0, count),
      request_params: { count, topikLevel },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      questions: questions.slice(0, count),
      topikLevel,
      source: ragContext.length > 0 ? 'rag+llm' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Listening] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
