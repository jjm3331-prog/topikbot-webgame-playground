import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

type TopikLevel = "1-2" | "3-4" | "5-6";
type GrammarType = "assembly" | "battle" | "correction";

// ============================================
// 🔥 급수별 Few-shot 예시 프롬프트
// ============================================
const TOPIK_GRAMMAR_EXAMPLES: Record<TopikLevel, string> = {
  "1-2": `[TOPIK 1-2급 문법 예시]

<문장 조립 예시>
{
  "id": "1",
  "type": "assembly",
  "question_ko": "학교에서 무엇을 해요?",
  "question_vi": "Bạn làm gì ở trường?",
  "parts": ["저는", "한국어를", "공부해요"],
  "answer": "저는 한국어를 공부해요",
  "explanation_ko": "주어(저는) + 목적어(한국어를) + 동사(공부해요) 순서입니다.",
  "explanation_vi": "Thứ tự: Chủ ngữ (저는) + Tân ngữ (한국어를) + Động từ (공부해요).",
  "grammarPoint_ko": "기본 문장 구조 (S+O+V)",
  "grammarPoint_vi": "Cấu trúc câu cơ bản (S+O+V)"
}

<빈칸 채우기 예시>
{
  "id": "1",
  "type": "battle",
  "question_ko": "사과___ 주세요.",
  "question_vi": "Xin cho tôi táo ___",
  "options": ["을", "를", "이", "가"],
  "answer": "를",
  "explanation_ko": "'사과'는 받침이 없으므로 '를'이 맞습니다.",
  "explanation_vi": "'사과' không có patchim nên dùng '를'.",
  "grammarPoint_ko": "목적격 조사 을/를",
  "grammarPoint_vi": "Trợ từ tân ngữ 을/를"
}

<오류 수정 예시>
{
  "id": "1",
  "type": "correction",
  "sentence_ko": "저는 학교를 가요.",
  "sentence_vi": "Tôi đi trường học.",
  "errorPart": "를",
  "correctPart": "에",
  "options": ["에", "를", "에서", "로"],
  "answer": "에",
  "explanation_ko": "'가다' 동사는 방향을 나타내는 '에'와 함께 씁니다.",
  "explanation_vi": "Động từ '가다' dùng với '에' chỉ hướng đi.",
  "grammarPoint_ko": "장소 조사 에/에서",
  "grammarPoint_vi": "Trợ từ địa điểm 에/에서"
}

[필수 문법]
- 조사: 은/는, 이/가, 을/를, 에, 에서, 로/으로
- 어미: -아요/-어요, -습니다/-ㅂ니다, -았/었어요
- 연결: -고, -아서/어서`,

  "3-4": `[TOPIK 3-4급 문법 예시]

<문장 조립 예시>
{
  "id": "1",
  "type": "assembly",
  "question_ko": "왜 회의에 늦었어요?",
  "question_vi": "Tại sao bạn đến họp muộn?",
  "parts": ["버스가", "안 와서", "지하철로", "갈아탔어요"],
  "answer": "버스가 안 와서 지하철로 갈아탔어요",
  "explanation_ko": "'-아서/어서'는 이유를 나타내는 연결어미입니다.",
  "explanation_vi": "'-아서/어서' là vĩ tố liên kết chỉ lý do.",
  "grammarPoint_ko": "이유 연결어미 -아서/어서",
  "grammarPoint_vi": "Vĩ tố liên kết lý do -아서/어서"
}

<빈칸 채우기 예시>
{
  "id": "1",
  "type": "battle",
  "question_ko": "비가 ___ 우산을 가져가세요.",
  "question_vi": "___ mưa nên hãy mang theo ô.",
  "options": ["오면", "오니까", "와서", "오는데"],
  "answer": "오니까",
  "explanation_ko": "'-으니까'는 명령/청유문 앞에서 이유를 나타냅니다.",
  "explanation_vi": "'-으니까' dùng trước câu mệnh lệnh/đề nghị để chỉ lý do.",
  "grammarPoint_ko": "-으니까 vs -아서",
  "grammarPoint_vi": "Phân biệt -으니까 và -아서"
}

<오류 수정 예시>
{
  "id": "1",
  "type": "correction",
  "sentence_ko": "내일 비가 오면 집에서 쉬겠습니다.",
  "sentence_vi": "Nếu ngày mai trời mưa thì tôi sẽ nghỉ ở nhà.",
  "errorPart": "오면",
  "correctPart": "오면 (정답)",
  "options": ["오면", "와서", "오니까", "오는데"],
  "answer": "오면",
  "explanation_ko": "가정/조건을 나타내는 '-으면'이 올바른 사용입니다.",
  "explanation_vi": "'-으면' chỉ giả định/điều kiện là cách dùng đúng.",
  "grammarPoint_ko": "조건 표현 -으면",
  "grammarPoint_vi": "Biểu hiện điều kiện -으면"
}

[필수 문법]
- 연결어미: -는데, -으면, -으니까, -아도/어도
- 표현: -게 되다, -아/어 보다, -기로 하다
- 추측: -을 것 같다, -나 보다, -을 텐데`,

  "5-6": `[TOPIK 5-6급 문법 예시]

<문장 조립 예시>
{
  "id": "1",
  "type": "assembly",
  "question_ko": "경제 위기 상황을 설명하세요.",
  "question_vi": "Hãy giải thích tình hình khủng hoảng kinh tế.",
  "parts": ["세계 경제가", "불안정해지면서", "국내 시장에도", "영향을 미치게 되었다"],
  "answer": "세계 경제가 불안정해지면서 국내 시장에도 영향을 미치게 되었다",
  "explanation_ko": "'-면서'는 두 상황의 동시 발생 또는 배경을 나타냅니다.",
  "explanation_vi": "'-면서' biểu thị hai tình huống xảy ra đồng thời hoặc bối cảnh.",
  "grammarPoint_ko": "동시 표현 -면서",
  "grammarPoint_vi": "Biểu hiện đồng thời -면서"
}

<빈칸 채우기 예시>
{
  "id": "1",
  "type": "battle",
  "question_ko": "그 정책은 경제 발전에 기여했을 ___ 환경 파괴라는 부작용도 초래했다.",
  "question_vi": "Chính sách đó ___ đã góp phần phát triển kinh tế nhưng cũng gây ra tác dụng phụ là phá hủy môi trường.",
  "options": ["뿐만 아니라", "뿐더러", "거니와", "는커녕"],
  "answer": "뿐더러",
  "explanation_ko": "'-을 뿐더러'는 앞 내용에 더해 뒤 내용까지 있음을 나타냅니다.",
  "explanation_vi": "'-을 뿐더러' biểu thị ngoài nội dung trước còn có thêm nội dung sau.",
  "grammarPoint_ko": "첨가 표현 -을 뿐더러",
  "grammarPoint_vi": "Biểu hiện bổ sung -을 뿐더러"
}

<오류 수정 예시>
{
  "id": "1",
  "type": "correction",
  "sentence_ko": "그가 아무리 노력해도 결과가 좋지 않았다.",
  "sentence_vi": "Dù anh ấy có cố gắng thế nào thì kết quả vẫn không tốt.",
  "errorPart": "해도",
  "correctPart": "한들",
  "options": ["한들", "해도", "하더라도", "했으면"],
  "answer": "한들",
  "explanation_ko": "'아무리 -한들'은 문어체에서 강한 양보를 나타냅니다.",
  "explanation_vi": "'아무리 -한들' trong văn viết biểu thị sự nhượng bộ mạnh.",
  "grammarPoint_ko": "양보 표현 -한들 (문어체)",
  "grammarPoint_vi": "Biểu hiện nhượng bộ -한들 (văn viết)"
}

[필수 문법]
- 문어체: -는 바, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도, -을지언정
- 학술 표현: -에 의하면, -(으)로 인해, -에 기인하다`
};

const SYSTEM_PROMPT = `당신은 TOPIK 문법 교육 전문가입니다.
대상: 베트남인 학습자

[핵심 규칙]
1. 출력은 오직 JSON 객체 {"questions": [...]} 형태만
2. 베트남어는 번역투 금지, 자연스러운 현지 표현
3. 급수별 문법 수준을 엄격히 준수`;

const typePrompts: Record<GrammarType, string> = {
  assembly: "문장 조립 퍼즐 문제 (parts 배열을 올바른 순서로 조합)",
  correction: "문법 오류 수정 문제 (틀린 부분 찾아 고치기)",
  battle: "빈칸 채우기 문법 퀴즈 (4지선다)",
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

  if (!response.ok) {
    console.error('Cohere rerank failed');
    return documents.slice(0, topN);
  }

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
      console.log('[Grammar] RAG: No results');
      return [];
    }

    console.log(`[Grammar] RAG: Found ${results.length} candidates`);

    let finalResults = results;
    if (cohereKey) {
      finalResults = await rerankResults(query, results, cohereKey, RAG_CONFIG.TOP_N);
    }

    return finalResults.filter((r: any) => (r.rerank_score ?? r.similarity) >= 0.5).map((r: any) => r.content);
  } catch (error) {
    console.error('[Grammar] RAG failed:', error);
    return [];
  }
}

// LLM Fallback - Gemini 2.5 Flash Lite
async function generateWithLLM(count: number, level: TopikLevel, type: GrammarType, ragContext: string[]): Promise<any> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const levelExamples = TOPIK_GRAMMAR_EXAMPLES[level];
  
  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\n[참고 자료]\n${ragContext.join('\n\n')}`;
  }

  const userPrompt = `${levelExamples}${contextSection}

[문제 유형: ${typePrompts[type]}]

위 예시와 동일한 품질로 TOPIK ${level}급 "${typePrompts[type]}" 문제 ${count}개를 생성하세요.
반드시 {"questions": [...]} 형태의 JSON으로 반환하세요.`;

  console.log(`[Grammar] LLM: ${count} ${type} questions for TOPIK ${level}`);

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
    console.error("[Grammar] Gemini error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse grammar JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, type, count = 10 } = (await req.json().catch(() => ({}))) as {
      level: TopikLevel;
      type: GrammarType;
      count?: number;
    };

    const safeLevel: TopikLevel = level === "3-4" || level === "5-6" ? level : "1-2";
    const safeType: GrammarType = type === "correction" || type === "battle" ? type : "assembly";
    const safeCount = Math.max(1, Math.min(30, Number.isFinite(count) ? count : 10));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const cohereKey = Deno.env.get('COHERE_API_KEY');

    // 캐시 확인 (v2)
    const cacheKey = `grammar_v2_${safeLevel}_${safeType}_${safeCount}`;
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("function_name", "grammar-content")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log("[Grammar] Cache HIT");
      await supabase.rpc("increment_cache_hit", { p_id: cached.id });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Grammar] Generating ${safeCount} ${safeType} for TOPIK ${safeLevel}`);

    // 1. RAG 검색
    let ragContext: string[] = [];
    if (openAIKey) {
      const ragQuery = `TOPIK ${safeLevel}급 문법 ${safeType === 'assembly' ? '문장 구조' : safeType === 'correction' ? '오류 수정' : '빈칸 채우기'}`;
      ragContext = await searchRAG(ragQuery, supabase, openAIKey, cohereKey);
    }

    // 2. LLM 생성
    const parsed = await generateWithLLM(safeCount, safeLevel, safeType, ragContext);

    // 캐시 저장
    await supabase.from("ai_response_cache").upsert({
      cache_key: cacheKey,
      function_name: "grammar-content",
      request_params: { level: safeLevel, type: safeType, count: safeCount },
      response: parsed,
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Grammar] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
