import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_DAILY_LIMIT = 10;

type Lang = "ko" | "vi" | "en" | "ja" | "zh" | "ru" | "uz";

const LANGUAGE_NAME: Record<Lang, string> = {
  ko: "Korean",
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  zh: "Chinese",
  ru: "Russian",
  uz: "Uzbek (Latin)",
};

function normalizeLang(lng?: string): Lang {
  const base = (lng || "ko").toLowerCase().split("-")[0];
  if (["ko", "vi", "en", "ja", "zh", "ru", "uz"].includes(base)) return base as Lang;
  return "ko";
}

function getDailyLimitMessage(lng: Lang) {
  const map: Record<Lang, string> = {
    ko: "오늘 무료 질문 횟수를 모두 사용했습니다 😢 프리미엄으로 업그레이드하면 무제한으로 질문할 수 있어요!",
    vi: "Bạn đã hết lượt hỏi miễn phí hôm nay 😢 Nâng cấp Premium để hỏi không giới hạn!",
    en: "You've used all free questions for today 😢 Upgrade to Premium for unlimited questions!",
    ja: "本日の無料質問回数を使い切りました 😢 Premiumにアップグレードすると無制限で質問できます！",
    zh: "今日的免费提问次数已用完 😢 升级Premium即可无限提问！",
    ru: "Вы использовали все бесплатные вопросы на сегодня 😢 Обновитесь до Premium для неограниченных вопросов!",
    uz: "Bugungi bepul savollar tugadi 😢 Cheksiz savollar uchun Premium ga yangilang!",
  };
  return map[lng];
}

function getRateLimitMessage(lng: Lang) {
  const map: Record<Lang, string> = {
    ko: "시스템이 혼잡합니다 🔄 잠시 후 다시 시도해주세요.",
    vi: "Hệ thống đang bận 🔄 Vui lòng thử lại sau ít phút.",
    en: "System is busy 🔄 Please try again in a moment.",
    ja: "システムが混雑しています 🔄 しばらくしてからお試しください。",
    zh: "系统繁忙 🔄 请稍后再试。",
    ru: "Система занята 🔄 Пожалуйста, попробуйте позже.",
    uz: "Tizim band 🔄 Keyinroq urinib ko'ring.",
  };
  return map[lng];
}

function buildSystemPrompt({
  language,
  agentId,
  ragContext,
}: {
  language: Lang;
  agentId?: string;
  ragContext?: string;
}) {
  const langName = LANGUAGE_NAME[language];

  const agentHint = (() => {
    switch ((agentId || "").toLowerCase()) {
      case "ielts":
        return "You specialize in IELTS (Listening/Reading/Writing/Speaking).";
      case "jlpt":
        return "You specialize in JLPT (N5–N1) Japanese learning.";
      case "hsk":
        return "You specialize in HSK (1–6) Chinese learning.";
      case "topik":
      default:
        return "You specialize in TOPIK Korean learning (TOPIK I & II).";
    }
  })();

  const base = `You are LUKATO AI Agent 🤖, an expert language tutor with multimodal capabilities.

Primary goal:
- Answer the user's question clearly and helpfully with high accuracy.
- When user sends an image, analyze it thoroughly and provide helpful insights.

Image analysis capabilities:
- You CAN see and analyze images the user sends.
- For TOPIK/language learning images: identify vocabulary, grammar patterns, questions, and provide explanations.
- For screenshots: read and explain the content.
- Describe what you see and answer questions about the image.

Language policy (VERY IMPORTANT):
- Default reply language: ${langName}.
- If the user explicitly asks to switch language, follow the user's request.

Writing rules (VERY IMPORTANT):
- Do NOT use romanization (Latin transcription) for Korean/Japanese/Chinese.
- When teaching vocabulary/phrases, prefer: original script → meaning in the reply language.

Formatting:
- Use friendly tone and appropriate emojis.
- Use markdown headings/lists.
- When using markdown tables, ensure they are properly formatted with header row, separator row, and data rows.
- Example table format:
| Column1 | Column2 |
|---------|---------|
| Data1   | Data2   |

${agentHint}`;

  if (ragContext && ragContext.trim()) {
    return `${base}

Reference context (RAG):
${ragContext}

Use the reference context above if it is relevant.`;
  }

  return base;
}

// Generate cache key from question (+ language + agent)
function generateCacheKey(question: string, language: Lang, agentId?: string): string {
  const normalized = question.toLowerCase().trim().replace(/\s+/g, " ");
  const a = (agentId || "topik").toLowerCase();
  return `ai_tutor_v5_${language}_${a}_${normalized.substring(0, 200)}`;
}

// Check and update daily usage
async function checkDailyLimit(
  supabase: any,
  userId: string,
  isPremium: boolean
): Promise<{ allowed: boolean; remaining: number }> {
  if (isPremium) {
    return { allowed: true, remaining: -1 }; // Unlimited for premium
  }

  const today = new Date().toISOString().split("T")[0];

  // Get or create usage record
  const { data: usage, error } = await supabase
    .from("ai_question_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching usage:", error);
    return { allowed: true, remaining: FREE_DAILY_LIMIT }; // Allow on error
  }

  if (!usage) {
    // Create new record
    await supabase.from("ai_question_usage").insert({
      user_id: userId,
      question_count: 1,
      last_reset_at: today,
    });
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  const lastReset = usage.last_reset_at.split("T")[0];

  if (lastReset !== today) {
    // Reset daily count
    await supabase
      .from("ai_question_usage")
      .update({
        question_count: 1,
        last_reset_at: today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  if (usage.question_count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await supabase
    .from("ai_question_usage")
    .update({ question_count: usage.question_count + 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { allowed: true, remaining: FREE_DAILY_LIMIT - usage.question_count - 1 };
}

// Check cache for similar question
async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_response_cache")
    .select("response, id")
    .eq("cache_key", cacheKey)
    .eq("function_name", "ai-tutor")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Increment hit count
  await supabase.rpc("increment_cache_hit", { p_id: data.id });

  return data.response?.text || null;
}

// Save to cache
async function saveToCache(supabase: any, cacheKey: string, response: string, question: string, language: Lang, agentId?: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

  await supabase
    .from("ai_response_cache")
    .upsert(
      {
        cache_key: cacheKey,
        function_name: "ai-tutor",
        response: { text: response },
        request_params: { question, language, agentId },
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
      },
      { onConflict: "cache_key" }
    );
}

// RAG search for relevant context
async function searchRAG(supabase: any, query: string): Promise<string> {
  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");

    if (!OPENAI_API_KEY) {
      console.log("No OpenAI key for embeddings, skipping RAG");
      return "";
    }

    // Generate embedding
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error("Embedding error:", await embeddingResponse.text());
      return "";
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search knowledge base
    const { data: chunks, error } = await supabase.rpc("search_knowledge", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.5,
      match_count: 10,
    });

    if (error || !chunks || chunks.length === 0) {
      console.log("No RAG results found");
      return "";
    }

    // Rerank with Cohere if available
    if (COHERE_API_KEY && chunks.length > 1) {
      try {
        const rerankResponse = await fetch("https://api.cohere.ai/v1/rerank", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "rerank-v3.5",
            query: query,
            documents: chunks.map((c: any) => c.content),
            top_n: 5,
            return_documents: false,
          }),
        });

        if (rerankResponse.ok) {
          const rerankData = await rerankResponse.json();
          const rerankedChunks = rerankData.results
            .filter((r: any) => r.relevance_score > 0.6)
            .map((r: any) => chunks[r.index]);

          if (rerankedChunks.length > 0) {
            return rerankedChunks.map((c: any) => c.content).join("\n\n---\n\n");
          }
        }
      } catch (e) {
        console.error("Rerank error:", e);
      }
    }

    // Return top 3 chunks without reranking
    return chunks.slice(0, 3).map((c: any) => c.content).join("\n\n---\n\n");
  } catch (error) {
    console.error("RAG search error:", error);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = true, language: rawLang, agentId } = await req.json();
    const language = normalizeLang(rawLang);

    // Get auth token
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    let userId = "anonymous";
    let isPremium = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        // Check premium status
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();
        isPremium = sub?.plan === "premium" || sub?.plan === "plus";
      }
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

    // Check daily limit
    const { allowed, remaining } = await checkDailyLimit(supabase, userId, isPremium);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "daily_limit_exceeded",
          message: getDailyLimitMessage(language),
          remaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache (language + agent aware)
    const cacheKey = generateCacheKey(lastUserMessage, language, agentId);
    const cachedResponse = await checkCache(supabase, cacheKey);
    if (cachedResponse) {
      console.log("Cache hit for:", cacheKey.substring(0, 80));
      return new Response(
        JSON.stringify({ response: cachedResponse, remaining, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RAG search for context
    const ragContext = await searchRAG(supabase, lastUserMessage);

    // Build system prompt with RAG context + language
    const systemPrompt = buildSystemPrompt({ language, agentId, ragContext });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Convert messages to OpenAI format with multimodal support
    let hasImages = false;
    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; content: string; images?: string[] }) => {
        // If message has images, use multimodal format
        if (msg.images && msg.images.length > 0) {
          hasImages = true;
          const contentParts: any[] = [];
          
          // Add text content first (if no text, add a default prompt)
          contentParts.push({ 
            type: "text", 
            text: msg.content || "이 이미지를 분석해주세요." 
          });
          
          // Add images
          for (const imageData of msg.images) {
            console.log("Processing image, length:", imageData.length, "starts with:", imageData.substring(0, 50));
            contentParts.push({
              type: "image_url",
              image_url: {
                url: imageData, // base64 data URL
                detail: "high"
              }
            });
          }
          
          return {
            role: msg.role,
            content: contentParts,
          };
        }
        
        // Text-only message
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
    ];

    console.log("Request - hasImages:", hasImages, "language:", language, "agent:", agentId, "messageCount:", openaiMessages.length);

    // Streaming mode with GPT-4.1-mini
    if (stream) {
      console.log("Streaming with gpt-4.1-mini, hasImages:", hasImages, "RAG:", ragContext.length > 0);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini-2025-04-14",
          messages: openaiMessages,
          stream: true,
          max_tokens: 16384, // Maximum output tokens for gpt-4.1-mini
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "rate_limit", message: getRateLimitMessage(language) }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Remaining-Questions": String(remaining),
        },
      });
    }

    // Non-streaming mode
    console.log("Non-streaming with gpt-4.1-mini, language:", language, "agent:", agentId);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini-2025-04-14",
        messages: openaiMessages,
        max_tokens: 16384,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit", message: getRateLimitMessage(language) }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse =
      data.choices?.[0]?.message?.content ||
      (language === "ko" ? "죄송해요, 지금은 답변할 수 없어요. 다시 시도해주세요." : "Sorry, I can't answer that right now. Please try again.");

    // Save to cache
    await saveToCache(supabase, cacheKey, aiResponse, lastUserMessage, language, agentId);

    return new Response(JSON.stringify({ response: aiResponse, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-tutor:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "server_error", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
