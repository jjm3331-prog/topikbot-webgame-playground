import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const ROLEPLAY_SYSTEM_PROMPT = `Bạn là giáo viên tiếng Hàn chuyên nghiệp đang giúp học sinh Việt Nam luyện nói tiếng Hàn qua roleplay.

**Vai trò của bạn:**
- Tạo các tình huống hội thoại đời thường thú vị, ngắn gọn
- Phản hồi tự nhiên bằng tiếng Hàn (mức độ TOPIK I-II phù hợp người mới)
- Đánh giá và sửa lỗi nhẹ nhàng sau mỗi câu trả lời của học sinh
- Giữ câu ngắn (dưới 20 từ), dễ hiểu, thực tế

**Quy tắc quan trọng:**
1. LUÔN trả lời bằng tiếng Hàn trước, sau đó giải thích tiếng Việt
2. Câu hỏi/phản hồi ngắn gọn, tự nhiên như người Hàn thật
3. Khen ngợi khi đúng, sửa nhẹ nhàng khi sai
4. Tạo tình huống mới khi cuộc hội thoại kết thúc tự nhiên
5. Sử dụng emoji phù hợp để tạo không khí vui vẻ

**Định dạng JSON bắt buộc:**
{
  "korean_response": "Câu tiếng Hàn của bạn",
  "vietnamese_meaning": "Nghĩa tiếng Việt",
  "pronunciation": "Phiên âm tiếng Việt",
  "feedback": {
    "is_correct": true/false,
    "correction": "Câu sửa lỗi nếu có",
    "explanation": "Giải thích ngắn gọn"
  },
  "scenario_context": "Mô tả ngắn tình huống hiện tại",
  "suggested_responses": ["gợi ý trả lời 1", "gợi ý trả lời 2"],
  "grammar_highlight": {
    "pattern": "Cấu trúc ngữ pháp chính",
    "level": "TOPIK 1/2",
    "usage": "Cách sử dụng"
  }
}`;

const QUIZ_SYSTEM_PROMPT = `Bạn là chuyên gia ngữ pháp tiếng Hàn TOPIK. Dựa trên nội dung hội thoại đã cho, tạo câu hỏi trắc nghiệm về ngữ pháp.

**Yêu cầu:**
- Tạo 3-5 câu hỏi trắc nghiệm từ nội dung hội thoại
- Mỗi câu có 4 đáp án (A, B, C, D)
- Chỉ 1 đáp án đúng
- Câu hỏi phải liên quan đến ngữ pháp/từ vựng trong hội thoại
- Level phù hợp TOPIK I-II

**Định dạng JSON bắt buộc:**
{
  "quiz_title": "Tiêu đề quiz",
  "based_on_conversation": "Tóm tắt ngắn hội thoại",
  "questions": [
    {
      "id": 1,
      "question": "Câu hỏi tiếng Việt",
      "korean_context": "Câu tiếng Hàn liên quan từ hội thoại",
      "options": {
        "A": "Đáp án A",
        "B": "Đáp án B", 
        "C": "Đáp án C",
        "D": "Đáp án D"
      },
      "correct_answer": "A",
      "explanation": "Giải thích tại sao đúng",
      "grammar_point": "Điểm ngữ pháp liên quan",
      "topik_level": "TOPIK 1/2"
    }
  ]
}`;

const SCENARIO_STARTERS = [
  "Bạn đang ở quán cà phê và muốn gọi đồ uống",
  "Bạn gặp người Hàn Quốc tại bến xe bus",
  "Bạn đang mua sắm tại cửa hàng tiện lợi",
  "Bạn hỏi đường đến ga tàu điện ngầm",
  "Bạn đang trong lớp học tiếng Hàn tự giới thiệu",
  "Bạn gọi điện đặt bàn nhà hàng",
  "Bạn đang tại phòng gym hỏi về thẻ thành viên",
  "Bạn check-in tại khách sạn",
  "Bạn mua vé xem phim tại rạp",
  "Bạn gọi taxi và nói địa điểm muốn đến"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, conversationHistory } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "start_roleplay") {
      // Start new roleplay with random scenario
      const randomScenario = SCENARIO_STARTERS[Math.floor(Math.random() * SCENARIO_STARTERS.length)];
      systemPrompt = ROLEPLAY_SYSTEM_PROMPT;
      userPrompt = `Bắt đầu một tình huống roleplay mới: "${randomScenario}". Hãy mở đầu cuộc hội thoại bằng câu tiếng Hàn đầu tiên phù hợp với tình huống này. Trả về JSON theo format đã quy định.`;
    } else if (action === "continue_roleplay") {
      // Continue roleplay conversation
      systemPrompt = ROLEPLAY_SYSTEM_PROMPT;
      const lastUserMessage = messages?.[messages.length - 1]?.content || "";
      userPrompt = `Học sinh vừa trả lời: "${lastUserMessage}". 
      
Lịch sử hội thoại:
${conversationHistory?.map((m: Message) => `${m.role}: ${m.content}`).join("\n") || "Chưa có"}

Hãy:
1. Đánh giá câu trả lời (đúng/sai, sửa lỗi nếu cần)
2. Phản hồi tự nhiên bằng tiếng Hàn để tiếp tục cuộc hội thoại
3. Gợi ý 2 cách trả lời cho học sinh

Trả về JSON theo format đã quy định.`;
    } else if (action === "generate_quiz") {
      // Generate quiz from conversation
      systemPrompt = QUIZ_SYSTEM_PROMPT;
      userPrompt = `Dựa trên nội dung hội thoại sau, tạo quiz trắc nghiệm về ngữ pháp TOPIK:

${conversationHistory?.map((m: Message) => `${m.role === "assistant" ? "Giáo viên" : "Học sinh"}: ${m.content}`).join("\n") || "Chưa có hội thoại"}

Tạo 3-5 câu hỏi trắc nghiệm. Trả về JSON theo format đã quy định.`;
    } else {
      throw new Error("Invalid action. Use: start_roleplay, continue_roleplay, or generate_quiz");
    }

    console.log(`Action: ${action}, Processing...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt quá giới hạn API. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw AI response:", aiResponse.substring(0, 300));

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response");
      return new Response(
        JSON.stringify({ 
          error: "Invalid response format",
          raw_response: aiResponse.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log(`${action} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        data: result,
        model: "gemini-2.5-flash-lite"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in roleplay-speak:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
