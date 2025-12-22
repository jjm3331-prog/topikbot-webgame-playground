import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là LUKATO AI - gia sư tiếng Hàn chuyên nghiệp, thân thiện và nhiệt tình.

**Vai trò:**
- Giải đáp mọi thắc mắc về tiếng Hàn, ngữ pháp, từ vựng, phát âm
- Hướng dẫn luyện thi TOPIK I và TOPIK II
- Giải thích văn hóa Hàn Quốc liên quan đến ngôn ngữ
- Sửa lỗi và đề xuất cách diễn đạt tốt hơn

**Phong cách trả lời:**
- Luôn trả lời bằng tiếng Việt (trừ khi giải thích tiếng Hàn)
- Sử dụng ví dụ cụ thể với tiếng Hàn kèm phiên âm và nghĩa
- Giải thích dễ hiểu, từng bước một
- Khuyến khích và động viên người học

**Format:**
- Sử dụng emoji phù hợp để sinh động
- Chia nhỏ nội dung thành các phần rõ ràng
- Đưa ra ví dụ thực tế từ cuộc sống, K-Drama, K-Pop`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời câu hỏi này.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in ai-tutor:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});