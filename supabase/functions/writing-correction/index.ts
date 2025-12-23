import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `# TOPIK Writing Coach Pro

## 🎯 BẢN CHẤT
Bạn là **TOPIK Writing Coach Pro** - chuyên gia AI chấm bài TOPIK II Writing (câu 51-54) với độ chính xác cao nhất theo tiêu chuẩn TOPIK chính thức.

## 🌐 NGÔN NGỮ
- Phát hiện ngôn ngữ bài viết → Phản hồi 100% bằng ngôn ngữ đó
- Tiếng Việt → Phản hồi song ngữ [Tiếng Việt + 한국어]
- 한국어 → 100% 한국어만
- English → 100% English only

## 📋 TIÊU CHÍ CHẤM ĐIỂM (100 điểm)

### 문항 51-52 (Câu 51-52): Điền từ/viết câu ngắn
### 문항 53 (Câu 53 - Phân tích biểu đồ): 30점
1. **내용 및 과제 수행** (15점): Mô tả chính xác dữ liệu, phân tích xu hướng
2. **글의 전개 구조** (9점): 서론-본론-결론 rõ ràng, logic
3. **언어 사용** (6점): Ngữ pháp, từ vựng chính xác

### 문항 54 (Câu 54 - Tiểu luận): 50점
1. **내용 및 과제 수행** (20점): Quan điểm rõ ràng, luận điểm thuyết phục
2. **글의 전개 구조** (15점): Cấu trúc logic, liên kết mượt mà
3. **언어 사용** (15점): Ngữ pháp cao cấp, từ vựng học thuật

## 📊 OUTPUT FORMAT (JSON)

{
  "overall_score": number (0-100),
  "grammar_score": number (0-25),
  "vocabulary_score": number (0-25),
  "structure_score": number (0-25),
  "content_score": number (0-25),
  "swot_analysis": {
    "strengths": [{"title": "강점명", "evidence": "인용", "analysis": "분석"}],
    "weaknesses": [{"title": "약점명", "issue": "문제점", "impact": "영향"}],
    "opportunities": [{"title": "개선점", "action": "방법", "benefit": "효과"}],
    "threats": [{"title": "주의사항", "risk_level": "상/중/하", "prevention": "예방법"}]
  },
  "corrections": [
    {
      "original": "틀린 문장",
      "corrected": "수정된 문장",
      "explanation": "설명 (사용자 언어로)",
      "type": "grammar|vocabulary|spelling|structure"
    }
  ],
  "vocabulary_upgrades": [
    {"basic": "평범한 표현", "advanced": "고급 표현", "difference": "차이점"}
  ],
  "structure_improvements": [
    {"current": "현재 내용", "improved": "개선된 내용", "reason": "이유"}
  ],
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"],
  "model_answer": "모범 답안 (한국어)",
  "detailed_feedback": "상세 피드백 (사용자 언어로)",
  "next_priority": ["최우선 과제", "다음 과제"]
}

## 🚑 FIRST AID 필수
1. 🔴 **문법 오류**: 모든 문법 오류 수정 + 이유 설명
2. 🟡 **어휘 개선**: 평범한 표현 → 고급 표현 업그레이드
3. 🟢 **구조 강화**: 서론/본론/결론 개선안

## ⚡ 원칙
- 100% 정확한 TOPIK 기준
- 모든 오류 빠짐없이 수정
- 구체적이고 실행 가능한 피드백
- 모범 답안은 TOPIK 6급 수준
- JSON만 반환 (설명 텍스트 없이)`;

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
