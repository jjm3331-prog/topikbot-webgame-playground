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
    const { questionImageUrl, answerImageUrl, answerText, ocrOnly } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // OCR-only mode: extract text from answer image
    if (ocrOnly && answerImageUrl) {
      console.log("OCR-only mode: extracting text from image");
      
      let imageData = answerImageUrl;
      let mimeType = "image/jpeg";
      
      // Handle base64 data URL
      if (answerImageUrl.startsWith("data:")) {
        const matches = answerImageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageData = matches[2];
        }
      } else {
        // Fetch image from URL
        try {
          const imgResponse = await fetch(answerImageUrl);
          const arrayBuffer = await imgResponse.arrayBuffer();
          imageData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          mimeType = imgResponse.headers.get("content-type") || "image/png";
        } catch (e) {
          console.error("Failed to fetch image for OCR:", e);
          return new Response(
            JSON.stringify({ extractedText: "" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const ocrResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: "이 이미지에서 한국어 텍스트를 추출해주세요. 손글씨나 타이핑된 텍스트 모두 포함합니다. 텍스트만 출력하고 다른 설명은 하지 마세요. 텍스트가 없으면 빈 문자열을 반환하세요." },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096
            }
          }),
        }
      );

      if (!ocrResponse.ok) {
        console.error("OCR API error:", await ocrResponse.text());
        return new Response(
          JSON.stringify({ extractedText: "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ocrData = await ocrResponse.json();
      const extractedText = ocrData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("OCR extracted text length:", extractedText.length);
      
      return new Response(
        JSON.stringify({ extractedText: extractedText.trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the content parts for Gemini
    const contentParts: any[] = [
      { text: `Đây là đề bài TOPIK II Writing. Hãy phân tích đề bài từ hình ảnh sau:` }
    ];

    // Fetch and convert question image to base64 if URL provided
    if (questionImageUrl) {
      try {
        const imgResponse = await fetch(questionImageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = imgResponse.headers.get("content-type") || "image/png";
        
        contentParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64
          }
        });
      } catch (e) {
        console.error("Failed to fetch question image:", e);
      }
    }

    if (answerImageUrl) {
      contentParts.push({ text: "Đây là bài làm của thí sinh (hình ảnh):" });
      
      try {
        const imgResponse = await fetch(answerImageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = imgResponse.headers.get("content-type") || "image/png";
        
        contentParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64
          }
        });
      } catch (e) {
        console.error("Failed to fetch answer image:", e);
      }
    }

    if (answerText) {
      contentParts.push({
        text: `Đây là bài làm của thí sinh (văn bản):\n\n${answerText}`
      });
    }

    contentParts.push({
      text: "Hãy chấm điểm và trả về kết quả theo định dạng JSON đã quy định."
    });

    console.log("Calling Gemini 2.5 Flash DIRECT API with thinkingBudget: 24576, maxOutputTokens: 65536");

    // Direct Gemini API call with thinkingBudget
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
              parts: [{ text: SYSTEM_PROMPT }]
            },
            {
              role: "model",
              parts: [{ text: "Vâng, tôi hiểu. Tôi sẽ chấm điểm bài viết TOPIK II theo tiêu chuẩn chính thức và trả về kết quả JSON." }]
            },
            {
              role: "user",
              parts: contentParts
            }
          ],
          generationConfig: {
            temperature: 0.7,
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini API response received - thinkingBudget applied");

    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
      model: "gemini-2.5-flash-thinking"
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
