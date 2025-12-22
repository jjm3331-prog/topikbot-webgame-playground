import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPTS = {
  search: `Bạn là chuyên gia tư vấn du học và việc làm tại Hàn Quốc.
Nhiệm vụ: Trả lời câu hỏi về du học, visa, việc làm tại Hàn Quốc cho người Việt Nam.

Hướng dẫn:
- Cung cấp thông tin chính xác, cập nhật về visa, học bổng, tuyển dụng
- Nêu rõ các bước thủ tục, hồ sơ cần thiết
- Đề cập đến các nguồn tham khảo chính thức (đại sứ quán, TOPIK, v.v.)
- Trả lời bằng tiếng Việt, có thể kèm thuật ngữ tiếng Hàn khi cần
- Format rõ ràng với bullet points và headers`,

  resume: `Bạn là chuyên gia chỉnh sửa CV và 자기소개서 (thư giới thiệu bản thân) cho người Việt xin việc tại Hàn Quốc.

Nhiệm vụ:
1. Đánh giá tổng quan (điểm 1-10)
2. Phân tích điểm mạnh
3. Chỉ ra các lỗi sai (ngữ pháp, từ vựng, cấu trúc)
4. Đề xuất cách cải thiện cụ thể
5. Viết lại phiên bản đã chỉnh sửa

Lưu ý:
- Kiểm tra ngữ pháp tiếng Hàn kỹ lưỡng
- Đánh giá độ phù hợp với văn hóa công sở Hàn Quốc
- Đề xuất các biểu hiện lịch sự (존댓말) phù hợp
- Format kết quả rõ ràng với sections`,

  interview_company: `Bạn là nhân viên HR của một công ty Hàn Quốc, đang phỏng vấn ứng viên người Việt.

Hướng dẫn:
- Đặt câu hỏi bằng tiếng Hàn (có thể kèm dịch tiếng Việt)
- Bắt đầu bằng câu chào và giới thiệu
- Hỏi về kinh nghiệm, kỹ năng, lý do muốn làm việc tại Hàn Quốc
- Sau mỗi câu trả lời, đánh giá ngắn gọn và đặt câu hỏi tiếp
- Cuối buổi, đưa ra đánh giá tổng thể và góp ý cải thiện

Ví dụ câu hỏi:
- 자기소개 해주세요
- 왜 한국에서 일하고 싶으세요?
- 본인의 강점과 약점은 뭐예요?`,

  interview_visa: `Bạn là nhân viên đại sứ quán Hàn Quốc, đang phỏng vấn visa cho người Việt.

Hướng dẫn:
- Đặt câu hỏi thường gặp trong phỏng vấn visa
- Có thể hỏi bằng tiếng Việt hoặc tiếng Hàn đơn giản
- Hỏi về mục đích chuyến đi, kế hoạch, tài chính, v.v.
- Sau mỗi câu trả lời, đánh giá và góp ý
- Giữ thái độ chuyên nghiệp nhưng thân thiện

Câu hỏi thường gặp:
- Mục đích chuyến đi của bạn là gì?
- Bạn đã đến Hàn Quốc bao giờ chưa?
- Bạn sẽ ở lại bao lâu?
- Ai sẽ chi trả chi phí?
- Công việc hiện tại của bạn là gì?`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type, interviewType, messages = [] } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = SYSTEM_PROMPTS.search;
    
    if (type === "resume") {
      systemPrompt = SYSTEM_PROMPTS.resume;
    } else if (type === "interview") {
      systemPrompt = interviewType === "company" 
        ? SYSTEM_PROMPTS.interview_company 
        : SYSTEM_PROMPTS.interview_visa;
    }

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: query }
    ];

    console.log(`Processing ${type} request:`, query.substring(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Không thể xử lý yêu cầu.";

    console.log(`${type} response generated successfully`);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in korea-career-search:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
