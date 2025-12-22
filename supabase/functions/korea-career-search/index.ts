import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPTS = {
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

// Use Perplexity for real-time web search
async function searchWithPerplexity(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }

  console.log("Searching with Perplexity:", query);

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { 
          role: "system", 
          content: `Bạn là chuyên gia tư vấn du học và việc làm tại Hàn Quốc cho người Việt Nam.
Trả lời câu hỏi dựa trên thông tin mới nhất từ web.
Luôn trích dẫn nguồn khi có thể.
Trả lời bằng tiếng Việt, format rõ ràng với bullet points.
Nếu có thông tin về thủ tục, hồ sơ, hãy liệt kê chi tiết.` 
        },
        { role: "user", content: query }
      ],
      search_recency_filter: "month",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Perplexity API error:", response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  let result = data.choices?.[0]?.message?.content || "Không tìm thấy kết quả.";
  
  // Append citations if available
  if (data.citations && data.citations.length > 0) {
    result += "\n\n📚 **Nguồn tham khảo:**\n";
    data.citations.slice(0, 5).forEach((citation: string, idx: number) => {
      result += `${idx + 1}. ${citation}\n`;
    });
  }

  return result;
}

// Use Lovable AI for resume and interview
async function chatWithLovableAI(systemPrompt: string, messages: Array<{role: string; content: string}>): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error("Lovable API key not configured");
  }

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

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
    console.error("Lovable AI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
    }
    
    throw new Error("AI service error");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Không thể xử lý yêu cầu.";
}

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

    let result: string;

    if (type === "search") {
      // Use Perplexity for real-time web search
      console.log("Processing search request with Perplexity");
      result = await searchWithPerplexity(query);
    } else if (type === "resume") {
      // Use Lovable AI for resume correction
      console.log("Processing resume correction");
      result = await chatWithLovableAI(SYSTEM_PROMPTS.resume, [
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: query }
      ]);
    } else if (type === "interview") {
      // Use Lovable AI for interview simulation
      console.log("Processing interview simulation");
      const systemPrompt = interviewType === "company" 
        ? SYSTEM_PROMPTS.interview_company 
        : SYSTEM_PROMPTS.interview_visa;
      result = await chatWithLovableAI(systemPrompt, [
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: query }
      ]);
    } else {
      // Default to Perplexity search
      result = await searchWithPerplexity(query);
    }

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
