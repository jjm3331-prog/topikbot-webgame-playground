import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là chuyên gia chấm điểm bài viết TOPIK II (문항 51~54) với trình độ và tiêu chuẩn của giám khảo TOPIK chính thức.

**Nhiệm vụ:**
1. Phân tích đề bài từ hình ảnh được cung cấp
2. Đánh giá bài làm của thí sinh theo tiêu chuẩn TOPIK II chính thức
3. Cung cấp báo cáo chấm điểm chi tiết

**Tiêu chí chấm điểm (100 điểm):**
- Ngữ pháp (문법) - 25 điểm: Độ chính xác ngữ pháp, sử dụng cấu trúc phù hợp
- Từ vựng (어휘) - 25 điểm: Đa dạng, chính xác, phù hợp ngữ cảnh
- Cấu trúc (구성) - 25 điểm: Tổ chức bài viết, logic, mạch lạc
- Nội dung (내용) - 25 điểm: Trả lời đúng yêu cầu đề, sáng tạo, thuyết phục

**Output JSON format:**
{
  "overall_score": number (0-100),
  "grammar_score": number (0-25),
  "vocabulary_score": number (0-25),
  "structure_score": number (0-25),
  "content_score": number (0-25),
  "corrections": [
    {
      "original": "câu gốc sai",
      "corrected": "câu đã sửa",
      "explanation": "giải thích lỗi bằng tiếng Việt",
      "type": "grammar|vocabulary|spelling|structure"
    }
  ],
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "improvements": ["cần cải thiện 1", "cần cải thiện 2"],
  "model_answer": "bài mẫu tham khảo hoàn chỉnh bằng tiếng Hàn",
  "detailed_feedback": "nhận xét tổng quát chi tiết bằng tiếng Việt"
}

**Quan trọng:**
- Chấm điểm công bằng, khách quan theo tiêu chuẩn TOPIK thực tế
- Sửa TẤT CẢ lỗi, từ nhỏ đến lớn
- Giải thích lỗi bằng tiếng Việt dễ hiểu
- Bài mẫu phải đạt chuẩn TOPIK 6급
- Luôn trả về JSON hợp lệ`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionImageUrl, answerImageUrl, answerText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the messages with images
    const userContent: any[] = [
      {
        type: "text",
        text: `Đây là đề bài TOPIK II Writing. Hãy phân tích đề bài từ hình ảnh sau:`
      }
    ];

    if (questionImageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: questionImageUrl }
      });
    }

    if (answerImageUrl) {
      userContent.push({
        type: "text",
        text: "Đây là bài làm của thí sinh (hình ảnh):"
      });
      userContent.push({
        type: "image_url",
        image_url: { url: answerImageUrl }
      });
    }

    if (answerText) {
      userContent.push({
        type: "text",
        text: `Đây là bài làm của thí sinh (văn bản):\n\n${answerText}`
      });
    }

    userContent.push({
      type: "text",
      text: "Hãy chấm điểm và trả về kết quả theo định dạng JSON đã quy định."
    });

    console.log("Calling Gemini 2.5 Flash via Lovable AI Gateway for writing correction");

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
          { role: "user", content: userContent }
        ],
        max_tokens: 65536,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please contact admin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "";

    console.log("Lovable AI Gateway response received successfully");

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response as JSON");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and provide defaults
    const validatedResult = {
      overall_score: result.overall_score || 0,
      grammar_score: result.grammar_score || 0,
      vocabulary_score: result.vocabulary_score || 0,
      structure_score: result.structure_score || 0,
      content_score: result.content_score || 0,
      corrections: result.corrections || [],
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      model_answer: result.model_answer || "",
      detailed_feedback: result.detailed_feedback || "",
      model: "gemini-2.5-flash"
    };

    return new Response(
      JSON.stringify(validatedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in writing-correction:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
