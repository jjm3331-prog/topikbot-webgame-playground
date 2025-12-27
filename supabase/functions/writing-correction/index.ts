import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

## ⚠️⚠️⚠️ CRITICAL: QUY TẮC ĐẾM SỐ KÝ TỰ (글자 수 세기) ⚠️⚠️⚠️

**ĐÂY LÀ QUY TẮC BẮT BUỘC THEO TIÊU CHUẨN TOPIK CHÍNH THỨC:**

🔴 **QUAN TRỌNG NHẤT**: Trong kỳ thi TOPIK, **KÝ TỰ CÁCH (띄어쓰기/SPACE) ĐƯỢC TÍNH LÀ 1 KÝ TỰ!**

### CÁCH ĐẾM ĐÚNG:
- ✅ Mỗi chữ cái Hangul = 1 ký tự (예: 한 = 1자, 국 = 1자)
- ✅ Mỗi dấu cách/space = 1 ký tự (예: "안녕 하세요" = 6자, không phải 5자!)
- ✅ Mỗi dấu chấm câu = 1 ký tự (예: . , ! ? = 1자)
- ✅ Mỗi số = 1 ký tự (예: 1, 2, 3 = 1자)
- ✅ Xuống dòng (줄바꿈) = KHÔNG tính

### VÍ DỤ MINH HỌA:
| Văn bản | Cách đếm SAI | Cách đếm ĐÚNG |
|---------|--------------|---------------|
| "안녕하세요" | 5자 | 5자 ✓ |
| "안녕 하세요" | 5자 ❌ | 6자 ✓ (có 1 space) |
| "나는 학생입니다." | 7자 ❌ | 9자 ✓ (2 spaces + 1 dấu chấm) |
| "한국어를 공부합니다." | 10자 ❌ | 12자 ✓ (1 space + 1 dấu chấm) |

### CÔNG THỨC ĐẾM:
**Tổng số ký tự = (Số chữ Hangul) + (Số dấu cách/space) + (Số dấu câu) + (Số con số)**

### YÊU CẦU SỐ KÝ TỰ THEO ĐỀ:
- 문항 53 (Phân tích biểu đồ): 200-300자 (bao gồm cả dấu cách!)
- 문항 54 (Tiểu luận): 600-700자 (bao gồm cả dấu cách!)

🚨 **NẾU BÀI VIẾT THIẾU SỐ KÝ TỰ**: Trừ điểm mạnh ở phần 내용 및 과제 수행!
🚨 **LUÔN BÁO CÁO CHÍNH XÁC**: "Bài viết của bạn có [X] ký tự (bao gồm dấu cách), yêu cầu là [Y]-[Z] ký tự."

## 📋 TIÊU CHÍ CHẤM ĐIỂM (100 điểm)

### 문항 51-52 (Câu 51-52): Điền từ/viết câu ngắn
### 문항 53 (Câu 53 - Phân tích biểu đồ): 30점
1. **내용 및 과제 수행** (15점): Mô tả chính xác dữ liệu, phân tích xu hướng, **ĐỦ 200-300자 (bao gồm dấu cách)**
2. **글의 전개 구조** (9점): 서론-본론-결론 rõ ràng, logic
3. **언어 사용** (6점): Ngữ pháp, từ vựng chính xác

### 문항 54 (Câu 54 - Tiểu luận): 50점
1. **내용 및 과제 수행** (20점): Quan điểm rõ ràng, luận điểm thuyết phục, **ĐỦ 600-700자 (bao gồm dấu cách)**
2. **글의 전개 구조** (15점): Cấu trúc logic, liên kết mượt mà
3. **언어 사용** (15점): Ngữ pháp cao cấp, từ vựng học thuật

## 📊 OUTPUT FORMAT (JSON)

{
  "overall_score": number (0-100),
  "grammar_score": number (0-25),
  "vocabulary_score": number (0-25),
  "structure_score": number (0-25),
  "content_score": number (0-25),
  "character_count": {
    "total": number (PHẢI ĐẾM CẢ DẤU CÁCH!),
    "required_min": number,
    "required_max": number,
    "is_sufficient": boolean,
    "note": "Bao gồm cả dấu cách (띄어쓰기) theo tiêu chuẩn TOPIK"
  },
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
1. 🔴 **글자 수 확인** (최우선!): 띄어쓰기 포함 정확한 글자 수 계산 및 보고
2. 🔴 **문법 오류**: 모든 문법 오류 수정 + 이유 설명
3. 🟡 **어휘 개선**: 평범한 표현 → 고급 표현 업그레이드
4. 🟢 **구조 강화**: 서론/본론/결론 개선안

## ⚡ 원칙
- 100% 정확한 TOPIK 기준
- **글자 수는 반드시 띄어쓰기 포함하여 계산** (이것이 실제 TOPIK 채점 기준!)
- 모든 오류 빠짐없이 수정
- 구체적이고 실행 가능한 피드백
- 모범 답안은 TOPIK 6급 수준
- JSON만 반환 (설명 텍스트 없이)`;

// 텍스트 정규화 함수 (캐시 비교용)
function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// SHA-256 해시 생성 함수
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionImageUrl, answerImageUrl, answerText, ocrOnly, userId } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Supabase 클라이언트 생성 (캐싱용)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

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

    // ========== 캐싱 로직 시작 ==========
    
    // 콘텐츠 해시 생성 (문제 URL + 답안 텍스트 조합)
    const normalizedAnswer = normalizeText(answerText || "");
    const contentForHash = `q:${questionImageUrl || ""}|a:${normalizedAnswer}`;
    const contentHash = await generateHash(contentForHash);
    
    console.log("Generated content hash:", contentHash.substring(0, 16) + "...");

    // 캐시 확인 (동일 사용자 + 동일 콘텐츠)
    if (userId) {
      const { data: cachedResult, error: cacheError } = await supabase
        .from("writing_corrections")
        .select("correction_report, score")
        .eq("user_id", userId)
        .eq("content_hash", contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cacheError && cachedResult && cachedResult.correction_report) {
        console.log("✅ CACHE HIT! Returning cached result for user:", userId);
        
        const cachedReport = cachedResult.correction_report as any;
        
        return new Response(
          JSON.stringify({
            ...cachedReport,
            is_cached: true,
            cache_message: "Kết quả này được lấy từ lịch sử chấm điểm trước đó. Điểm số và nhận xét nhất quán với lần chấm trước."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("❌ CACHE MISS - Calling AI for fresh grading");
    }

    // ========== 캐싱 로직 끝 ==========

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
    const grammarScore = Math.min(25, Math.max(0, result.grammar_score || 0));
    const vocabularyScore = Math.min(25, Math.max(0, result.vocabulary_score || 0));
    const structureScore = Math.min(25, Math.max(0, result.structure_score || 0));
    const contentScore = Math.min(25, Math.max(0, result.content_score || 0));
    
    // ⚠️ CRITICAL: overall_score MUST be the sum of the four individual scores
    // AI sometimes returns inconsistent values, so we calculate it ourselves
    const calculatedOverallScore = grammarScore + vocabularyScore + structureScore + contentScore;
    
    console.log(`Score validation: grammar=${grammarScore}, vocabulary=${vocabularyScore}, structure=${structureScore}, content=${contentScore}, calculated_total=${calculatedOverallScore}, ai_reported=${result.overall_score}`);
    
    if (result.overall_score && Math.abs(result.overall_score - calculatedOverallScore) > 1) {
      console.warn(`⚠️ SCORE MISMATCH: AI reported ${result.overall_score} but sum is ${calculatedOverallScore}. Using calculated value.`);
    }
    
    const validatedResult = {
      overall_score: calculatedOverallScore, // Always use calculated sum, never trust AI's overall_score
      grammar_score: grammarScore,
      vocabulary_score: vocabularyScore,
      structure_score: structureScore,
      content_score: contentScore,
      corrections: result.corrections || [],
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      model_answer: result.model_answer || "",
      detailed_feedback: result.detailed_feedback || "",
      character_count: result.character_count || null,
      swot_analysis: result.swot_analysis || null,
      vocabulary_upgrades: result.vocabulary_upgrades || [],
      structure_improvements: result.structure_improvements || [],
      next_priority: result.next_priority || [],
      model: "gemini-2.5-flash-thinking",
      is_cached: false
    };

    // ========== 결과 저장 (캐싱용) ==========
    if (userId) {
      try {
        const { error: insertError } = await supabase
          .from("writing_corrections")
          .insert({
            user_id: userId,
            question_image_url: questionImageUrl || null,
            answer_image_url: answerImageUrl || null,
            answer_text: answerText || null,
            score: validatedResult.overall_score,
            correction_report: validatedResult,
            content_hash: contentHash,
            is_cached: false
          });

        if (insertError) {
          console.error("Failed to save correction for caching:", insertError);
        } else {
          console.log("✅ Correction saved with hash for future caching:", contentHash.substring(0, 16) + "...");
        }
      } catch (saveError) {
        console.error("Error saving correction:", saveError);
      }
    }

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
