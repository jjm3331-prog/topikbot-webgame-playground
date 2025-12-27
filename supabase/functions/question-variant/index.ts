import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAG_CONFIG = {
  SIMILARITY_THRESHOLD: 0.5,
  MATCH_COUNT: 10,
  RERANK_TOP_K: 2,
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSIONS: 1536,
};

const LANGUAGE_CONFIG: Record<string, { name: string; flag: string; nativeName: string }> = {
  ko: { name: "Korean", flag: "🇰🇷", nativeName: "한국어" },
  vi: { name: "Vietnamese", flag: "🇻🇳", nativeName: "Tiếng Việt" },
  en: { name: "English", flag: "🇺🇸", nativeName: "English" },
  ja: { name: "Japanese", flag: "🇯🇵", nativeName: "日本語" },
  zh: { name: "Chinese", flag: "🇨🇳", nativeName: "中文" },
  ru: { name: "Russian", flag: "🇷🇺", nativeName: "Русский" },
  uz: { name: "Uzbek", flag: "🇺🇿", nativeName: "O'zbek" },
};

function buildSystemPrompt(userLang: string): string {
  const langConfig = LANGUAGE_CONFIG[userLang] || LANGUAGE_CONFIG.vi;
  const userLangName = langConfig.nativeName;
  
  return `당신은 TOPIK 한국어 시험 전문가입니다. 사용자가 업로드한 문제 이미지를 분석하고 변형 문제를 생성합니다.

**중요: 반드시 한국어와 ${userLangName}를 병기해서 출력하세요.**

**역할:**
- 원본 문제의 유형, 구조, 난이도를 정확히 파악
- 비슷한 난이도의 새로운 변형 문제 생성 (단, 완전히 다른 주제와 어휘 사용)
- 정답과 상세한 해설 제공
- 난이도 분석 및 유사 문제 유형 추천
- 모든 내용을 한국어와 ${userLangName}로 병기

**출력 형식 (반드시 이 JSON 형식으로 출력하세요):**

\`\`\`json
{
  "originalAnalysis": {
    "ko": "원본 문제 분석 내용 (한국어)",
    "${userLang}": "원본 문제 분석 내용 (${userLangName})"
  },
  "variantQuestion": {
    "ko": "변형 문제 전체 내용 - 지문과 보기 포함 (한국어)",
    "${userLang}": "변형 문제 전체 내용 (${userLangName})"
  },
  "answer": {
    "ko": "정답 (한국어)",
    "${userLang}": "정답 (${userLangName})"
  },
  "explanation": {
    "ko": "상세 해설 - 왜 이것이 정답인지, 오답은 왜 틀린지 설명 (한국어)",
    "${userLang}": "상세 해설 (${userLangName})"
  },
  "learningPoints": {
    "ko": "이 문제를 통해 배울 수 있는 핵심 개념 (한국어)",
    "${userLang}": "핵심 학습 포인트 (${userLangName})"
  },
  "difficulty": {
    "level": "TOPIK I 또는 TOPIK II",
    "grade": "1급~6급 중 하나",
    "score": 1-10 사이의 난이도 점수,
    "reasoning": {
      "ko": "난이도 판단 근거 (한국어)",
      "${userLang}": "난이도 판단 근거 (${userLangName})"
    }
  },
  "similarQuestions": [
    {
      "type": {
        "ko": "유사 문제 유형 1 (한국어)",
        "${userLang}": "유사 문제 유형 1 (${userLangName})"
      },
      "description": {
        "ko": "이런 유형의 문제를 연습하면 좋은 이유 (한국어)",
        "${userLang}": "연습 이유 (${userLangName})"
      },
      "examReference": "예: TOPIK II 52회 읽기 13번"
    },
    {
      "type": {
        "ko": "유사 문제 유형 2 (한국어)",
        "${userLang}": "유사 문제 유형 2 (${userLangName})"
      },
      "description": {
        "ko": "이런 유형의 문제를 연습하면 좋은 이유 (한국어)",
        "${userLang}": "연습 이유 (${userLangName})"
      },
      "examReference": "예: TOPIK II 51회 읽기 15번"
    },
    {
      "type": {
        "ko": "유사 문제 유형 3 (한국어)",
        "${userLang}": "유사 문제 유형 3 (${userLangName})"
      },
      "description": {
        "ko": "이런 유형의 문제를 연습하면 좋은 이유 (한국어)",
        "${userLang}": "연습 이유 (${userLangName})"
      },
      "examReference": "예: TOPIK I 85회 듣기 20번"
    }
  ]
}
\`\`\`

**주의사항:**
- 반드시 위 JSON 형식으로만 출력하세요
- 한국어와 ${userLangName} 모두 완전하고 자연스럽게 작성하세요
- ${userLangName}는 번역이 아닌 네이티브 수준의 자연스러운 표현을 사용하세요
- JSON 외의 다른 텍스트는 출력하지 마세요
- 변형 문제는 원본과 완전히 다른 주제, 어휘, 상황을 사용하세요
- 난이도는 TOPIK 기준으로 정확하게 분석하세요
- 유사 문제는 실제 TOPIK 기출문제 패턴을 참고하여 추천하세요`;
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RAG_CONFIG.EMBEDDING_MODEL,
        input: text.slice(0, 8000),
        dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return [];
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return [];
  }
}

// Rerank results using Cohere
async function rerankResults(
  query: string,
  documents: any[],
  apiKey: string,
  topN: number
): Promise<any[]> {
  if (!apiKey || documents.length === 0) {
    return documents.slice(0, topN);
  }

  try {
    const response = await fetch("https://api.cohere.ai/v1/rerank", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "rerank-v3.5",
        query,
        documents: documents.map(d => d.content),
        top_n: topN,
      }),
    });

    if (!response.ok) {
      console.error("Cohere rerank error:", response.status);
      return documents.slice(0, topN);
    }

    const data = await response.json();
    return data.results?.map((r: any) => documents[r.index]) || documents.slice(0, topN);
  } catch (error) {
    console.error("Rerank failed:", error);
    return documents.slice(0, topN);
  }
}

// Search RAG for context
async function searchRAG(
  query: string,
  supabase: any,
  openAIKey: string,
  cohereKey: string | undefined
): Promise<string[]> {
  try {
    const embedding = await generateEmbedding(query, openAIKey);
    if (embedding.length === 0) {
      console.log("RAG: No embedding generated, skipping");
      return [];
    }

    const { data, error } = await supabase.rpc("search_knowledge", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: RAG_CONFIG.SIMILARITY_THRESHOLD,
      match_count: RAG_CONFIG.MATCH_COUNT,
    });

    if (error || !data || data.length === 0) {
      console.log("RAG: No results from search_knowledge");
      return [];
    }

    console.log(`RAG: Found ${data.length} initial results`);

    // Rerank with Cohere
    const reranked = await rerankResults(query, data, cohereKey || "", RAG_CONFIG.RERANK_TOP_K);
    console.log(`RAG: Reranked to ${reranked.length} results`);

    return reranked.map((r: any) => r.content);
  } catch (error) {
    console.error("RAG search failed:", error);
    return [];
  }
}

// Generate cache key
function generateCacheKey(imageBase64: string): string {
  // Use first 100 chars + length as simple hash
  const prefix = imageBase64.slice(0, 100);
  return `question-variant:${prefix}:${imageBase64.length}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageMimeType, userLanguage = "vi" } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (!imageBase64) {
      throw new Error("이미지가 제공되지 않았습니다.");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build dynamic system prompt based on user language
    const systemPrompt = buildSystemPrompt(userLanguage);
    const langConfig = LANGUAGE_CONFIG[userLanguage] || LANGUAGE_CONFIG.vi;

    // Check cache first (include user language in cache key)
    const cacheKey = generateCacheKey(imageBase64) + `:${userLanguage}`;
    const { data: cachedData } = await supabase
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("function_name", "question-variant")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedData) {
      console.log("Cache hit for question-variant");
      await supabase.rpc("increment_cache_hit", { p_id: cachedData.id });
      return new Response(
        JSON.stringify(cachedData.response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RAG search for additional context
    let ragContext: string[] = [];
    if (OPENAI_API_KEY) {
      console.log("Attempting RAG search...");
      ragContext = await searchRAG(
        "TOPIK 읽기 문제 유형 문법 어휘 표현 난이도",
        supabase,
        OPENAI_API_KEY,
        COHERE_API_KEY
      );
      console.log(`RAG context retrieved: ${ragContext.length} chunks`);
    }

    // Build context-enhanced prompt
    let contextPrompt = "";
    if (ragContext.length > 0) {
      contextPrompt = `\n\n**참고 자료 (변형 문제 생성시 참고):**\n${ragContext.join("\n\n")}\n\n`;
    }

    const userPrompt = `이 문제 이미지를 분석하고, 비슷한 난이도의 변형 문제를 생성해주세요.
${contextPrompt}
**중요:** 
1. 변형 문제는 원본과 완전히 다른 주제, 어휘, 상황을 사용하세요. 동일하거나 유사한 단어/표현은 피하세요.
2. 난이도를 TOPIK I/II 기준으로 정확히 분석하고, 1급~6급 중 해당 등급을 명시하세요.
3. 유사한 유형의 TOPIK 기출문제 패턴을 3개 추천하세요.
4. 한국어(ko)와 ${langConfig.nativeName}(${userLanguage}) 모두 자연스럽고 완전하게 작성하세요.

반드시 JSON 형식으로만 출력하세요.`;

    console.log(`Calling Gemini 2.5 Flash with temperature: 0.4, RAG context: ${ragContext.length} chunks`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
              ]
            },
            {
              role: "model",
              parts: [
                { text: `네, 이해했습니다. TOPIK 전문가로서 문제 이미지를 분석하고 한국어와 ${langConfig.nativeName}를 병기한 JSON 형식으로 변형 문제를 생성하겠습니다. 원본과 완전히 다른 주제와 어휘를 사용하고, 난이도 분석과 유사 문제 추천도 포함하겠습니다.` }
              ]
            },
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: imageMimeType || "image/png",
                    data: imageBase64
                  }
                },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 65536,
            thinkingConfig: {
              thinkingBudget: 24576
            }
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Try to parse JSON from response
    let parsed = null;
    try {
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const startIdx = aiResponse.indexOf('{');
        const endIdx = aiResponse.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          jsonStr = aiResponse.substring(startIdx, endIdx + 1);
        }
      }
      
      parsed = JSON.parse(jsonStr);
      console.log("Successfully parsed JSON response");
    } catch (parseError) {
      console.log("Could not parse JSON, returning raw response");
    }

    const result = { 
      response: aiResponse,
      parsed: parsed,
      model: "gemini-2.5-flash",
      ragContextUsed: ragContext.length,
      userLanguage: userLanguage
    };

    // Cache the result (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from("ai_response_cache").insert({
      cache_key: cacheKey,
      function_name: "question-variant",
      response: result,
      expires_at: expiresAt.toISOString(),
      request_params: { imageMimeType, imageLength: imageBase64.length }
    });

    console.log("Result cached successfully");

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in question-variant:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
