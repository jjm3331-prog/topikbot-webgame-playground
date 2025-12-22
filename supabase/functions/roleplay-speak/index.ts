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

**Định dạng JSON (giữ ngắn gọn):**
{"korean_response":"Câu Hàn","vietnamese_meaning":"Nghĩa Việt","pronunciation":"Phiên âm","feedback":{"is_correct":true,"correction":"","explanation":""},"scenario_context":"Tình huống","suggested_responses":["gợi ý 1","gợi ý 2"],"grammar_highlight":{"pattern":"Ngữ pháp","level":"TOPIK 1","usage":"Cách dùng"}}

QUAN TRỌNG: Giữ mỗi field NGẮN NHẤT có thể. Không quá 30 ký tự mỗi field.`;

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
            temperature: 0.7,
            maxOutputTokens: 4096,
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
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw AI response:", aiResponse.substring(0, 300));

    // Clean markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

    // Extract JSON from response - find the outermost JSON object
    let jsonStart = aiResponse.indexOf("{");
    let jsonEnd = -1;
    let braceCount = 0;
    
    for (let i = jsonStart; i < aiResponse.length; i++) {
      if (aiResponse[i] === "{") braceCount++;
      if (aiResponse[i] === "}") braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No valid JSON found in response");
      return new Response(
        JSON.stringify({ 
          error: "Invalid response format",
          raw_response: aiResponse.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jsonString = aiResponse.substring(jsonStart, jsonEnd);
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Try to fix common JSON issues
      const fixedJson = jsonString
        .replace(/,\s*}/g, "}")  // Remove trailing commas
        .replace(/,\s*]/g, "]")  // Remove trailing commas in arrays
        .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
      
      try {
        result = JSON.parse(fixedJson);
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to parse AI response",
            raw_response: jsonString.substring(0, 500)
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
