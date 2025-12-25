import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TopikLevel = "1-2" | "3-4" | "5-6";
type GrammarType = "assembly" | "battle" | "correction";

const TOPIK_GRAMMAR_GUIDELINES: Record<TopikLevel, string> = {
  "1-2": `
초급 문법 (TOPIK I):
- 기본 조사: 은/는, 이/가, 을/를, 에, 에서, 로/으로
- 기본 어미: -아요/어요, -았/었어요, -(으)ㄹ 거예요
- 연결어미: -고, -아서/어서, -지만
- 의문문: -아요/어요?, 뭐, 어디, 언제, 왜
- 부정: 안, -지 않다
`,
  "3-4": `
중급 문법 (TOPIK II 중급):
- 연결어미: -는데, -으면, -으니까, -아도/어도, -으면서
- 표현: -게 되다, -아/어 보다, -기로 하다, -는 것 같다
- 피동/사동: -이/히/리/기, -게 하다
- 간접화법: -다고 하다, -냐고 하다, -라고 하다
- 추측: -을 것 같다, -나 보다, -는 모양이다
`,
  "5-6": `
고급 문법 (TOPIK II 고급):
- 격식체: -습니다/ㅂ니다, -습니까/ㅂ니까
- 문어체: -는 바, -는 한, -기 마련이다, -는 셈이다
- 고급 연결: -거니와, -는다손 치더라도, -기는커녕
- 관용 표현: -을 법하다, -는 가운데, -기에 앞서
- 학술적 표현: -에 의하면, -(으)로 인해, -에 따르면
`,
};

const typePrompts: Record<GrammarType, string> = {
  assembly: `문장 조립 퍼즐 문제를 생성하세요.
각 문제는:
- parts: 섞인 어절 배열 (3-6개)
- answer: 올바른 순서로 조립된 완성 문장 (한국어)
- explanation_ko/explanation_vi: 문법 설명 (한/베)
- grammarPoint_ko/grammarPoint_vi: 학습 포인트 (한/베)

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "assembly",
      "question_ko": "힌트 또는 상황 설명(한국어)",
      "question_vi": "Gợi ý hoặc tình huống (tiếng Việt)",
      "parts": ["어절1", "어절2"],
      "answer": "어절1 어절2",
      "explanation_ko": "문법 설명",
      "explanation_vi": "Giải thích ngữ pháp",
      "grammarPoint_ko": "학습 포인트",
      "grammarPoint_vi": "Điểm ngữ pháp"
    }
  ]
}`,
  correction: `문법 오류 수정형 데이터를 생성하세요. (UI가 재구성되어도 데이터는 아래 스키마를 유지)
각 문제는:
- sentence_ko/sentence_vi: 오류가 포함된 문장(한/베)
- errorPart: 틀린 부분(한국어에서 그대로 발췌, 단어/조사/어미)
- correctPart: 올바른 표현(한국어)
- options: 선택지 4개 (정답 포함, 한국어)
- answer: 정답(한국어)
- explanation_ko/explanation_vi: 왜 틀렸는지/왜 정답인지 (한/베)
- grammarPoint_ko/grammarPoint_vi: 오류 유형/학습 포인트 (한/베)

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "correction",
      "sentence_ko": "틀린 문장",
      "sentence_vi": "Câu sai",
      "errorPart": "틀린부분",
      "correctPart": "정답",
      "options": ["정답", "오답1", "오답2", "오답3"],
      "answer": "정답",
      "explanation_ko": "설명",
      "explanation_vi": "Giải thích",
      "grammarPoint_ko": "오류 유형",
      "grammarPoint_vi": "Loại lỗi"
    }
  ]
}`,
  battle: `빈칸 채우기 문법 퀴즈를 생성하세요.
각 문제는:
- question_ko/question_vi: 빈칸(___)이 있는 문장(한/베)
- options: 4개의 선택지 (한국어)
- answer: 정답 (한국어)
- explanation_ko/explanation_vi: 간단하지만 핵심을 찌르는 해설 (한/베)
- grammarPoint_ko/grammarPoint_vi: 문법 포인트 (한/베)

JSON 형식:
{
  "questions": [
    {
      "id": "1",
      "type": "battle",
      "question_ko": "저는 한국어___ 공부해요",
      "question_vi": "Tôi học tiếng Hàn ___",
      "options": ["를", "을", "가", "이"],
      "answer": "를",
      "explanation_ko": "간단한 설명",
      "explanation_vi": "Giải thích ngắn",
      "grammarPoint_ko": "목적격 조사",
      "grammarPoint_vi": "Tiểu từ tân ngữ"
    }
  ]
}`,
};

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("OpenAI embeddings error:", resp.status, t);
    throw new Error(`Embeddings error: ${resp.status}`);
  }

  const data = await resp.json();
  return data.data?.[0]?.embedding ?? [];
}

function safeExtractJsonObject(raw: string): string | null {
  const match = raw.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
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
    const safeCount = Math.max(1, Math.min(30, Number.isFinite(count) ? (count as number) : 10));

    console.log("grammar-content request", { level: safeLevel, type: safeType, count: safeCount });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cacheKey = `grammar_${safeLevel}_${safeType}_${safeCount}`;
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("function_name", "grammar-content")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log("Cache hit for grammar content");
      await supabase.rpc("increment_cache_hit", { p_id: cached.id });
      return new Response(JSON.stringify(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------------------- RAG (mandatory; if no docs found, still proceed with LLM) ----------------------
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    let ragContent = "";

    try {
      if (openAIApiKey) {
        const ragQuery = `TOPIK ${safeLevel} 한국어 문법: ${safeType} 유형 문제 만들기. 핵심 문법 포인트, 예문, 흔한 오답 패턴.`;
        const emb = await generateEmbedding(ragQuery, openAIApiKey);
        const { data: results } = await supabase.rpc("search_knowledge", {
          query_embedding: JSON.stringify(emb),
          match_threshold: safeLevel === "5-6" ? 0.45 : 0.5,
          match_count: 8,
        });

        if (results?.length) {
          ragContent = results
            .map((r: any, i: number) => `[#${i + 1}] ${r.document_title}\n${r.content}`)
            .join("\n\n---\n\n");
        }
      }
    } catch (e) {
      console.error("RAG error (continuing with non-RAG generation)", e);
    }

    // ---------------------- LLM generation (xAI) ----------------------
    const X_AI_API_KEY = Deno.env.get("X_AI_API_KEY");
    if (!X_AI_API_KEY) throw new Error("X_AI_API_KEY not configured");

    const systemPrompt = `당신은 한국어(TOPIK) 문법 교육 전문가입니다.
사용자: 베트남어 학습자.

반드시 아래 규칙을 지키세요.
- 출력은 오직 JSON 하나만 (마크다운 금지)
- 베트남어는 번역투 금지, 자연스러운 네이티브 표현
- 난이도는 TOPIK ${safeLevel}급에 엄격히 맞출 것

[TOPIK 가이드]
${TOPIK_GRAMMAR_GUIDELINES[safeLevel]}

[품질 규칙]
1) 문제 문장은 자연스럽고 현실적인 상황
2) 오답은 그럴듯하지만 명확히 틀리게 설계
3) 해설은 '왜 정답인지' + '왜 오답인지'까지 간단명료하게
`;

    const userPrompt = `${typePrompts[safeType]}

생성 개수: ${safeCount}

[RAG 참고자료]
${ragContent ? ragContent : "(참고자료 없음 - 내부 지식으로 생성하되, 품질 규칙을 더 엄격히 지킬 것)"}`;

    const primaryModel = "grok-4-1-fast-reasoning";
    // User requested: force this model only (avoid fallback-model 404)
    const fallbackModel = "grok-4-1-fast-reasoning";

    let resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${X_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: primaryModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: safeLevel === "5-6" ? 0.6 : 0.8,
      }),
    });

    if (!resp.ok && (resp.status === 400 || resp.status === 404)) {
      const t = await resp.text().catch(() => "");
      console.warn("xAI model rejected, retrying with fallback model:", resp.status, t);

      resp = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${X_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: safeLevel === "5-6" ? 0.6 : 0.8,
        }),
      });
    }

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("xAI API error:", resp.status, t);
      throw new Error(`AI API error: ${resp.status}`);
    }

    const aiData = await resp.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonStr = safeExtractJsonObject(content);
    if (!jsonStr) throw new Error("Failed to parse AI response as JSON object");

    const parsed = JSON.parse(jsonStr);

    await supabase.from("ai_response_cache").insert({
      cache_key: cacheKey,
      function_name: "grammar-content",
      request_params: { level: safeLevel, type: safeType, count: safeCount },
      response: parsed,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in grammar-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
