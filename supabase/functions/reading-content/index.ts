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
const TOPIK_READING_EXAMPLES: Record<string, string> = {
  "1-2": `[TOPIK 1-2급 읽기 예시]

<빈칸 문법 예시>
{
  "id": 1,
  "passage": "저는 매일 아침 7시___ 일어납니다.",
  "question": "빈칸에 알맞은 것을 고르십시오.",
  "options": ["①에", "②를", "③이", "④은"],
  "answer": 1,
  "explanationKo": "정답은 ①번입니다. '7시'는 시간이므로 시간을 나타내는 조사 '에'가 필요합니다.",
  "explanationVi": "Đáp án đúng là số ①. '7시' là thời gian nên cần trợ từ '에' chỉ thời gian."
}

<주제 파악 예시>
{
  "id": 2,
  "passage": "저는 한국 음식을 좋아합니다. 특히 김치찌개와 비빔밥을 자주 먹습니다. 한국 음식은 맛있고 건강에도 좋습니다.",
  "question": "이 글의 중심 생각은 무엇입니까?",
  "options": ["①한국 음식 만드는 법", "②한국 음식이 좋은 이유", "③김치찌개 재료", "④건강한 생활"],
  "answer": 2,
  "explanationKo": "정답은 ②번입니다. 필자가 한국 음식을 좋아하는 이유(맛있고 건강에 좋음)를 설명하고 있습니다.",
  "explanationVi": "Đáp án đúng là số ②. Tác giả giải thích lý do thích đồ ăn Hàn (ngon và tốt cho sức khỏe)."
}

[필수 어휘/문법]
- 조사: 이/가, 을/를, 은/는, 에, 에서
- 문장: 짧고 명확, 일상 주제`,

  "3-4": `[TOPIK 3-4급 읽기 예시]

<빈칸 추론 예시>
{
  "id": 1,
  "passage": "최근 재택근무가 늘어나면서 직장인들의 생활 패턴이 크게 변했다. 출퇴근 시간이 줄어들어 (        ) 반면, 일과 생활의 경계가 모호해지는 문제도 생겼다.",
  "question": "빈칸에 들어갈 내용으로 가장 알맞은 것은?",
  "options": ["①스트레스가 증가한", "②개인 시간이 늘어난", "③업무 효율이 떨어진", "④회의 시간이 길어진"],
  "answer": 2,
  "explanationKo": "정답은 ②번입니다. 출퇴근 시간이 줄면 그만큼 개인 시간이 늘어나므로 긍정적 결과를 나타내는 ②가 적절합니다.",
  "explanationVi": "Đáp án đúng là số ②. Khi thời gian đi làm giảm thì thời gian cá nhân tăng lên, nên ② là phù hợp."
}

<내용 일치 예시>
{
  "id": 2,
  "passage": "한국의 사계절 중 가을은 단풍으로 유명합니다. 특히 설악산과 내장산은 단풍 명소로 많은 관광객이 찾습니다. 가을 단풍은 보통 9월 말부터 시작해서 11월 초까지 볼 수 있습니다.",
  "question": "이 글의 내용과 같은 것을 고르십시오.",
  "options": ["①한국에는 사계절이 없다", "②단풍은 여름에 볼 수 있다", "③설악산은 단풍 명소이다", "④관광객은 단풍을 싫어한다"],
  "answer": 3,
  "explanationKo": "정답은 ③번입니다. 지문에서 '설악산과 내장산은 단풍 명소'라고 명시되어 있습니다.",
  "explanationVi": "Đáp án đúng là số ③. Bài đọc nói rõ 'Núi Seorak và Naejang là điểm ngắm lá đỏ nổi tiếng'."
}

[필수 어휘/문법]
- 연결어미: -는데, -으면서, -지만
- 추측: -것 같다, -을 수 있다`,

  "5-6": `[TOPIK 5-6급 읽기 예시]

<문장 배열 예시>
{
  "id": 1,
  "passage": "(가) 이러한 변화는 전통적 가치관과 충돌을 일으키기도 한다.\n(나) 현대 사회에서 가족의 형태는 다양해지고 있다.\n(다) 1인 가구, 비혼 가정, 다문화 가정 등 새로운 가족 유형이 증가하고 있다.\n(라) 그러나 다양성을 인정하는 것이 사회 통합에 중요하다는 인식이 확산되고 있다.",
  "question": "글의 순서로 가장 알맞은 것은?",
  "options": ["①(나)-(다)-(가)-(라)", "②(다)-(나)-(라)-(가)", "③(가)-(라)-(나)-(다)", "④(나)-(가)-(다)-(라)"],
  "answer": 1,
  "explanationKo": "정답은 ①번입니다. (나) 주제 제시 → (다) 구체적 예시 → (가) 문제점 지적 → (라) 해결 방향 제시의 논리적 흐름입니다.",
  "explanationVi": "Đáp án đúng là số ①. (나) Đề xuất chủ đề → (다) Ví dụ cụ thể → (가) Chỉ ra vấn đề → (라) Đề xuất hướng giải quyết."
}

<종합 독해 예시>
{
  "id": 2,
  "passage": "인공지능의 발전은 노동 시장에 근본적인 변화를 가져올 것으로 예측된다. 단순 반복 업무는 자동화되는 반면, 창의성과 감성 지능이 요구되는 직종은 오히려 중요성이 커질 전망이다. 이에 따라 교육 시스템도 암기 중심에서 문제 해결 능력 중심으로 전환해야 한다는 주장이 제기되고 있다.",
  "question": "이 글의 중심 내용으로 가장 적절한 것은?",
  "options": ["①AI가 모든 일자리를 대체할 것이다", "②AI 시대에 맞는 교육 변화가 필요하다", "③암기 교육이 가장 효과적이다", "④단순 업무가 더 중요해질 것이다"],
  "answer": 2,
  "explanationKo": "정답은 ②번입니다. AI로 인한 노동 시장 변화와 이에 따른 교육 시스템 전환 필요성을 주장하고 있습니다.",
  "explanationVi": "Đáp án đúng là số ②. Bài viết nêu sự thay đổi thị trường lao động do AI và sự cần thiết phải chuyển đổi hệ thống giáo dục."
}

[필수 어휘/문법]
- 문어체: -는 바, -기 마련이다
- 학술: 패러다임, 담론, 함의`
};

const SYSTEM_PROMPT = `당신은 TOPIK 읽기 시험 전문가입니다.
대상: 베트남인 학습자

[핵심 규칙]
1. 출력은 오직 JSON 배열만 (마크다운 금지)
2. 베트남어는 번역투 금지, 현지인이 쓰는 자연스러운 표현
3. 급수별 어휘/문법 수준을 엄격히 준수
4. 해설은 왜 정답인지 + 오답 분석 포함
5. **정답-해설 불일치 금지**: answer 번호(1~4)와 해설에서 언급하는 정답 번호가 반드시 같아야 함
   - 해설은 "정답은 ①번입니다."처럼 정답 번호로 시작할 것

[JSON 스키마]
{
  "id": number,
  "passage": "지문 (한국어)",
  "question": "질문 (한국어)",
  "options": ["①", "②", "③", "④"],
  "answer": 1-4 (1-based 인덱스),
  "explanationKo": "정답은 X번입니다. (해설 - answer와 반드시 일치)",
  "explanationVi": "Đáp án đúng là số X. (Giải thích tiếng Việt tự nhiên)"
}`;

const TAB_PROMPTS: Record<string, Record<string, string>> = {
  readingA: {
    grammar: "빈칸에 알맞은 조사/어미를 고르는 문법 문제",
    vocabulary: "유의어/반의어/의미를 묻는 어휘 문제",
    topic: "글의 주제/중심 내용을 파악하는 문제",
    match: "내용 일치/불일치를 묻는 문제",
    headline: "신문기사 제목과 본문 매칭 문제",
  },
  readingB: {
    order: "문장 배열 순서를 맞추는 문제",
    inference: "빈칸에 들어갈 내용을 추론하는 문제",
    linked: "연계 지문 문제 (2문제 1세트)",
    comprehensive: "종합 독해 문제",
  },
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
      console.log('[Reading] RAG: No results');
      return [];
    }

    let finalResults = results;
    if (cohereKey) {
      finalResults = await rerankResults(query, results, cohereKey, RAG_CONFIG.TOP_N);
    }

    return finalResults.filter((r: any) => (r.rerank_score ?? r.similarity) >= 0.5).map((r: any) => r.content);
  } catch (error) {
    console.error('[Reading] RAG failed:', error);
    return [];
  }
}

// LLM Fallback - Gemini 2.5 Flash Lite
async function generateWithLLM(
  count: number,
  topikLevel: string,
  tab: string,
  subTab: string,
  ragContext: string[]
): Promise<any[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const levelExamples = TOPIK_READING_EXAMPLES[topikLevel] || TOPIK_READING_EXAMPLES["1-2"];
  const tabPrompts = TAB_PROMPTS[tab] || TAB_PROMPTS.readingA;
  const questionType = tabPrompts[subTab] || tabPrompts.grammar;

  let contextSection = "";
  if (ragContext.length > 0) {
    contextSection = `\n\n[참고 자료]\n${ragContext.join('\n\n')}`;
  }

  const userPrompt = `${levelExamples}${contextSection}

[문제 유형: ${questionType}]

위 예시와 동일한 품질로 TOPIK ${topikLevel}급 "${questionType}" 문제 ${count}개를 JSON 배열로 생성하세요.`;

  console.log(`[Reading] LLM: ${count} ${subTab} for TOPIK ${topikLevel}`);

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
    console.error("[Reading] Gemini error:", response.status, errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse reading JSON");
  }
}

type ReadingQuestion = {
  id?: number;
  passage: string;
  question: string;
  options: string[];
  answer: number; // 1-4 (1-based)
  explanationKo: string;
  explanationVi: string;
};

function normalizeReadingQuestions(raw: any[]): ReadingQuestion[] {
  const answerSymbols = ['①', '②', '③', '④'];

  // raw answer가 0을 포함하면(명확히 0-based) → 전체를 0-based로 간주
  const treatAsZeroBased = raw.some((q) => typeof q?.answer === 'number' && q.answer === 0);

  return raw.map((q, idx) => {
    const options = Array.isArray(q?.options) ? q.options.map(String) : [];

    // 해설에서 정답 번호 추출 (가능하면)
    const koToken = String(q?.explanationKo ?? '').match(/정답\s*(?:은|는|:)\s*([①②③④1-4])/);
    const koAnswer = koToken?.[1]
      ? (koToken[1] === '①' || koToken[1] === '1') ? 1
        : (koToken[1] === '②' || koToken[1] === '2') ? 2
        : (koToken[1] === '③' || koToken[1] === '3') ? 3
        : (koToken[1] === '④' || koToken[1] === '4') ? 4
        : null
      : null;

    let ans = Number(q?.answer);
    if (!Number.isFinite(ans)) ans = koAnswer ?? 1;

    // 0-based → 1-based 보정
    if (treatAsZeroBased && ans >= 0 && ans <= 3) ans = ans + 1;
    // 범위 보정
    if (ans < 1 || ans > 4) ans = koAnswer ?? 1;

    // 해설이 명시한 정답이 있으면 그걸 최우선으로 맞춤
    if (koAnswer !== null && koAnswer !== ans) {
      console.log(`[Reading] Q${idx + 1}: Answer mismatch (answer=${ans}, explanation=${koAnswer}) → using explanation`);
      ans = koAnswer;
    }

    const expectedSymbol = answerSymbols[ans - 1];
    const explanationKoRaw = String(q?.explanationKo ?? '').trim();
    const explanationKo = explanationKoRaw
      ? (/^정답\s*(?:은|는|:)\s*[①②③④1-4]/.test(explanationKoRaw)
           ? explanationKoRaw
          : `정답은 ${expectedSymbol}번입니다. ${explanationKoRaw}`)
      : `정답은 ${expectedSymbol}번입니다.`;

    const explanationViRaw = String(q?.explanationVi ?? '').trim();
    const explanationVi = explanationViRaw
      ? (/^Đáp\s*án/i.test(explanationViRaw) ? explanationViRaw : `Đáp án đúng là số ${expectedSymbol}. ${explanationViRaw}`)
      : `Đáp án đúng là số ${expectedSymbol}.`;

    return {
      id: Number.isFinite(Number(q?.id)) ? Number(q.id) : idx + 1,
      passage: String(q?.passage ?? ''),
      question: String(q?.question ?? ''),
      options,
      answer: ans,
      explanationKo,
      explanationVi,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topikLevel = body.level || "1-2";
    const tab = body.tab || "readingA";
    const subTab = body.subTab || "grammar";
    const count = Math.min(Math.max(body.count || 5, 1), 10);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const cohereKey = Deno.env.get('COHERE_API_KEY');

    // 캐시 확인 (v2)
    const cacheKey = `reading_v2_${topikLevel}_${tab}_${subTab}_${count}`;
    const { data: cached } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('function_name', 'reading-content')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log(`[Reading] Cache HIT: ${cacheKey}`);
      await supabase.rpc('increment_cache_hit', { p_id: cached.id });
      return new Response(JSON.stringify({
        success: true,
        questions: cached.response,
        topikLevel,
        type: tab,
        tabType: subTab,
        source: 'cache',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Reading] Generating ${count} questions for TOPIK ${topikLevel}, ${tab}/${subTab}`);

    // 1. RAG 검색
    let ragContext: string[] = [];
    if (openAIKey) {
      const ragQuery = `TOPIK ${topikLevel}급 읽기 ${TAB_PROMPTS[tab]?.[subTab] || ''}`;
      ragContext = await searchRAG(ragQuery, supabase, openAIKey, cohereKey);
    }

    // 2. LLM 생성
    const rawQuestions = await generateWithLLM(count, topikLevel, tab, subTab, ragContext);
    const questions = normalizeReadingQuestions(rawQuestions);

    // 캐시 저장
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await supabase.from('ai_response_cache').upsert({
      cache_key: cacheKey,
      function_name: 'reading-content',
      response: questions,
      request_params: { count, topikLevel, tab, subTab },
      expires_at: expiresAt,
      hit_count: 0,
    }, { onConflict: 'cache_key' });

    return new Response(JSON.stringify({
      success: true,
      questions,
      topikLevel,
      type: tab,
      tabType: subTab,
      source: ragContext.length > 0 ? 'rag+llm' : 'llm',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Reading] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
