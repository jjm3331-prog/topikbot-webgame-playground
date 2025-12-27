import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `# TOPIK Writing Coach Pro - Ultra Precision Mode

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

### YÊU CẦU SỐ KÝ TỰ THEO ĐỀ:
- 문항 53 (Phân tích biểu đồ): 200-300자 (bao gồm cả dấu cách!)
- 문항 54 (Tiểu luận): 600-700자 (bao gồm cả dấu cách!)

🚨 **NẾU BÀI VIẾT THIẾU SỐ KÝ TỰ**: Trừ điểm mạnh ở phần 내용 및 과제 수행!

## ⚠️⚠️⚠️ CRITICAL: 점수 계산 규칙 (MUST FOLLOW - NO EXCEPTIONS!) ⚠️⚠️⚠️

### 🔴 절대 규칙 (ABSOLUTE RULE):
**overall_score = grammar_score + vocabulary_score + structure_score + content_score**

### 각 영역 점수 범위:
- grammar_score: 0~25점 (정수만)
- vocabulary_score: 0~25점 (정수만)
- structure_score: 0~25점 (정수만)
- content_score: 0~25점 (정수만)
- **overall_score: 0~100점 (반드시 위 4개 점수의 합계!)**

### ✅ 올바른 점수 계산 예시:
| grammar | vocabulary | structure | content | overall |
|---------|------------|-----------|---------|---------|
| 20 | 18 | 22 | 15 | **75** ✓ |
| 22 | 22 | 23 | 13 | **80** ✓ |
| 15 | 12 | 18 | 10 | **55** ✓ |
| 25 | 25 | 25 | 25 | **100** ✓ |

### ❌ 잘못된 점수 계산 (절대 금지!):
| grammar | vocabulary | structure | content | overall | 오류 |
|---------|------------|-----------|---------|---------|------|
| 22 | 22 | 23 | 13 | 37 | ❌ 합계가 80인데 37로 잘못 표기! |
| 20 | 18 | 22 | 15 | 50 | ❌ 합계가 75인데 50으로 잘못 표기! |

## 📋 채점 기준 상세 (각 25점 만점)

### 1. 문법 (grammar_score: 0-25점)
- 25점: 문법 오류 0개, 완벽한 문장 구조
- 20-24점: 경미한 오류 1-2개 (조사, 어미 실수)
- 15-19점: 중간 수준 오류 3-5개
- 10-14점: 심각한 오류 다수, 의미 전달에 문제
- 0-9점: 기본 문장 구조 미흡, 읽기 어려움

### 2. 어휘 (vocabulary_score: 0-25점)
- 25점: TOPIK 6급 수준 학술 어휘, 다양하고 정확한 사용
- 20-24점: 적절하고 다양한 어휘 선택
- 15-19점: 평범한 어휘, 일부 반복
- 10-14점: 제한적 어휘, 부적절한 사용
- 0-9점: 매우 제한적, 기초 어휘만 사용

### 3. 구조 (structure_score: 0-25점)
- 25점: 완벽한 서론-본론-결론, 논리적 흐름, 자연스러운 연결
- 20-24점: 명확한 구조, 약간의 개선 여지
- 15-19점: 기본 구조 있으나 전환 미흡
- 10-14점: 구조 불명확, 논리적 흐름 약함
- 0-9점: 구조 없음, 무질서한 나열

### 4. 내용 (content_score: 0-25점)
- 25점: 과제 완벽 수행, 글자 수 충족, 설득력 있는 논거
- 20-24점: 과제 수행 양호, 논거 적절
- 15-19점: 기본 요구 충족, 깊이 부족
- 10-14점: 과제 부분 수행, 글자 수 미달
- 0-9점: 과제 미수행 또는 심각한 글자 수 부족

## 📊 OUTPUT FORMAT (JSON)

⚠️ **CRITICAL**: overall_score는 반드시 grammar_score + vocabulary_score + structure_score + content_score의 합이어야 함!

{
  "overall_score": number (= grammar + vocabulary + structure + content, 반드시 합산값!),
  "grammar_score": number (0-25, 정수),
  "vocabulary_score": number (0-25, 정수),
  "structure_score": number (0-25, 정수),
  "content_score": number (0-25, 정수),
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
1. 🔴 **점수 합산 확인** (최우선!): overall_score = 4개 점수 합계인지 반드시 검증!
2. 🔴 **글자 수 확인**: 띄어쓰기 포함 정확한 글자 수 계산 및 보고
3. 🔴 **문법 오류**: 모든 문법 오류 수정 + 이유 설명
4. 🟡 **어휘 개선**: 평범한 표현 → 고급 표현 업그레이드
5. 🟢 **구조 강화**: 서론/본론/결론 개선안

## ⚡ 원칙
- 100% 정확한 TOPIK 기준
- **overall_score = grammar + vocabulary + structure + content (절대 규칙!)**
- **글자 수는 반드시 띄어쓰기 포함하여 계산**
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
            temperature: 0.15, // 🔥 최적화: 일관성 극대화 (0.1~0.2가 채점에 최적)
            topP: 0.95,        // 🔥 추가: 확률 분포 제한으로 안정성 향상
            topK: 40,          // 🔥 추가: 토큰 선택 범위 제한
            maxOutputTokens: 65536,
            thinkingConfig: {
              thinkingBudget: 32768 // 🔥 증가: 더 정밀한 분석을 위한 사고 예산 확대
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
