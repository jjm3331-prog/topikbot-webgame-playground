import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là LUKATO AI Agent 🤖 - chuyên gia tư vấn học tiếng Hàn và thi TOPIK hàng đầu Việt Nam!

**Vai trò chính:**
- Giải đáp mọi thắc mắc về tiếng Hàn: ngữ pháp, từ vựng, phát âm, cấu trúc câu
- Hướng dẫn chiến lược luyện thi TOPIK I và TOPIK II chi tiết
- Giải thích văn hóa Hàn Quốc liên quan đến ngôn ngữ
- Sửa lỗi và đề xuất cách diễn đạt tự nhiên hơn

**Nguyên tắc trả lời:**
1. LUÔN trả lời bằng tiếng Việt (chỉ dùng tiếng Hàn khi cần thiết để giải thích)
2. Ưu tiên thông tin từ ngữ cảnh RAG nếu có
3. Đưa ví dụ cụ thể với tiếng Hàn + phiên âm + nghĩa tiếng Việt
4. Giải thích từng bước, dễ hiểu
5. Khuyến khích và động viên người học 💪

**Format trả lời (RẤT QUAN TRỌNG):**
- Sử dụng emoji phù hợp để tạo không khí thân thiện 😊✨🎯📝
- Sử dụng **bold** cho từ khóa quan trọng
- Sử dụng bảng markdown khi so sánh ngữ pháp/từ vựng
- Sử dụng danh sách có đánh số hoặc bullet points
- Chia nhỏ nội dung thành các phần rõ ràng với tiêu đề
- Đưa ví dụ thực tế từ K-Drama, K-Pop khi phù hợp 🎬🎵
- Nếu không chắc chắn, nói rõ và đề xuất tìm hiểu thêm

**Ví dụ format tốt:**

## 📚 So sánh -아/어서 và -니까

| Ngữ pháp | Ý nghĩa | Ví dụ |
|----------|---------|-------|
| -아/어서 | Nguyên nhân/lý do | 배가 고파서 밥을 먹었어요 |
| -니까 | Lý do (chủ quan hơn) | 시간이 없으니까 빨리 가세요 |

### ✨ Mẹo phân biệt:
1. **-아/어서** không dùng với mệnh lệnh/đề nghị
2. **-니까** có thể dùng với mệnh lệnh

Cứ hỏi thêm nếu cần nhé! 화이팅! 🇰🇷`;

const FREE_DAILY_LIMIT = 30;

// Generate cache key from question
function generateCacheKey(question: string): string {
  const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ');
  return `ai_tutor_v3_${normalized.substring(0, 200)}`;
}

// Check and update daily usage
async function checkDailyLimit(supabase: any, userId: string, isPremium: boolean): Promise<{ allowed: boolean; remaining: number }> {
  if (isPremium) {
    return { allowed: true, remaining: -1 }; // Unlimited for premium
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Get or create usage record
  const { data: usage, error } = await supabase
    .from('ai_question_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching usage:', error);
    return { allowed: true, remaining: FREE_DAILY_LIMIT }; // Allow on error
  }

  if (!usage) {
    // Create new record
    await supabase.from('ai_question_usage').insert({
      user_id: userId,
      question_count: 1,
      last_reset_at: today
    });
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  const lastReset = usage.last_reset_at.split('T')[0];
  
  if (lastReset !== today) {
    // Reset daily count
    await supabase.from('ai_question_usage')
      .update({ question_count: 1, last_reset_at: today, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }

  if (usage.question_count >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await supabase.from('ai_question_usage')
    .update({ question_count: usage.question_count + 1, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  
  return { allowed: true, remaining: FREE_DAILY_LIMIT - usage.question_count - 1 };
}

// Check cache for similar question
async function checkCache(supabase: any, cacheKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_response_cache')
    .select('response, id')
    .eq('cache_key', cacheKey)
    .eq('function_name', 'ai-tutor')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Increment hit count
  await supabase.rpc('increment_cache_hit', { p_id: data.id });
  
  return data.response?.text || null;
}

// Save to cache
async function saveToCache(supabase: any, cacheKey: string, response: string, question: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

  await supabase.from('ai_response_cache').upsert({
    cache_key: cacheKey,
    function_name: 'ai-tutor',
    response: { text: response },
    request_params: { question },
    expires_at: expiresAt.toISOString(),
    hit_count: 0
  }, { onConflict: 'cache_key' });
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
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 1536
      })
    });

    if (!embeddingResponse.ok) {
      console.error("Embedding error:", await embeddingResponse.text());
      return "";
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search knowledge base
    const { data: chunks, error } = await supabase.rpc('search_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.5,
      match_count: 10
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
            "Authorization": `Bearer ${COHERE_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "rerank-v3.5",
            query: query,
            documents: chunks.map((c: any) => c.content),
            top_n: 5,
            return_documents: false
          })
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
    const { messages, stream = true } = await req.json();
    
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
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        // Check premium status
        const { data: sub } = await supabase
          .from('user_subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .maybeSingle();
        isPremium = sub?.plan === 'premium' || sub?.plan === 'plus';
      }
    }

    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || "";

    // Check daily limit
    const { allowed, remaining } = await checkDailyLimit(supabase, userId, isPremium);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: "daily_limit_exceeded",
          message: "Bạn đã hết lượt hỏi miễn phí hôm nay 😢 Nâng cấp Premium để hỏi không giới hạn!",
          remaining: 0
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache
    const cacheKey = generateCacheKey(lastUserMessage);
    const cachedResponse = await checkCache(supabase, cacheKey);
    if (cachedResponse) {
      console.log("Cache hit for:", cacheKey.substring(0, 50));
      return new Response(
        JSON.stringify({ response: cachedResponse, remaining, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RAG search for context
    const ragContext = await searchRAG(supabase, lastUserMessage);
    
    // Build system prompt with RAG context
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    if (ragContext) {
      enhancedSystemPrompt += `\n\n**📖 Ngữ cảnh tham khảo (RAG):**\n${ragContext}\n\nHãy ưu tiên sử dụng thông tin từ ngữ cảnh trên nếu liên quan đến câu hỏi.`;
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const contents = [
      { role: "user", parts: [{ text: enhancedSystemPrompt }] },
      { role: "model", parts: [{ text: "Hiểu rồi! Mình là LUKATO AI Agent - chuyên gia tư vấn tiếng Hàn và luyện thi TOPIK! 🤖✨ Mình sẽ giúp bạn học tiếng Hàn hiệu quả nhất! 화이팅! 🇰🇷💪" }] },
      ...geminiMessages
    ];

    // Streaming mode with Gemini 2.5 Flash
    if (stream) {
      console.log("Streaming with gemini-2.5-flash, thinking_budget enabled, RAG context:", ragContext.length > 0);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 8192,
              thinkingConfig: {
                thinkingBudget: 2048
              }
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "rate_limit", message: "Hệ thống đang bận 🔄 Vui lòng thử lại sau ít phút." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      // Add remaining info to stream headers
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Remaining-Questions": String(remaining),
        },
      });
    }

    // Non-streaming mode
    console.log("Non-streaming with gemini-2.5-flash, thinking_budget enabled, RAG context:", ragContext.length > 0);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            thinkingConfig: {
              thinkingBudget: 2048
            }
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit", message: "Hệ thống đang bận 🔄 Vui lòng thử lại sau ít phút." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Xin lỗi, mình không thể trả lời câu hỏi này 😅 Vui lòng thử lại nhé!";

    // Save to cache
    await saveToCache(supabase, cacheKey, aiResponse, lastUserMessage);

    return new Response(
      JSON.stringify({ response: aiResponse, remaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-tutor:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "server_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
