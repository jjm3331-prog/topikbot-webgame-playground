import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_LANGS = ["ko", "vi", "uz", "ru", "en", "zh", "ja"] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

function normalizeLang(input: unknown): SupportedLang {
  const v = typeof input === "string" ? input : "";
  return (SUPPORTED_LANGS as readonly string[]).includes(v) ? (v as SupportedLang) : "ko";
}

function getCacheMessage(lang: SupportedLang) {
  const map: Record<SupportedLang, string> = {
    ko: "이 결과는 이전 채점 기록에서 불러왔습니다. 점수와 피드백은 이전 채점과 동일합니다.",
    vi: "Kết quả này được lấy từ lịch sử chấm điểm trước đó. Điểm số và nhận xét nhất quán với lần chấm trước.",
    en: "This result was loaded from your previous grading history. The score and feedback match the earlier evaluation.",
    ja: "この結果は以前の採点履歴から読み込みました。点数とフィードバックは前回と同一です。",
    zh: "该结果来自你之前的评分记录，分数与反馈与上次一致。",
    ru: "Этот результат загружен из вашей предыдущей истории проверки. Балл и отзыв совпадают с прошлой оценкой.",
    uz: "Ushbu natija avvalgi tekshiruv tarixingizdan yuklandi. Ball va fikrlar oldingi baholash bilan bir xil."
  };
  return map[lang];
}

function getSystemPrompt(lang: SupportedLang) {
  const languageRule: Record<SupportedLang, string> = {
    ko: "모든 설명/피드백/항목의 텍스트는 100% 한국어로 작성한다.",
    vi: "Tất cả phần giải thích/nhận xét/ghi chú phải viết 100% bằng Tiếng Việt.",
    en: "All explanations/feedback/notes must be written 100% in English.",
    ja: "説明/フィードバック/注記はすべて100%日本語で書く。",
    zh: "所有解释/反馈/说明必须100%使用中文。",
    ru: "Все объяснения/отзывы/примечания должны быть написаны на 100% по-русски.",
    uz: "Barcha izohlar/fikr-mulohazalar/qo‘shimcha eslatmalar 100% o‘zbek tilida yozilsin."
  };

  return `# TOPIK Writing Coach Pro (Strict JSON)

## 역할
당신은 TOPIK II 쓰기(51~54) 채점 전문가입니다. 공식 TOPIK 기준으로 매우 엄격하고 일관되게 채점합니다.

## 응답 언어 (강제)
- UI 언어 = ${lang}
- ${languageRule[lang]}
- 단, JSON 키 이름은 아래 스키마 그대로 유지한다.

## 글자 수(문자 수) 규칙 (TOPIK 공식)
- 띄어쓰기(공백)도 1자로 반드시 포함하여 계산한다.
- 줄바꿈(개행)은 글자 수에 포함하지 않는다.

## 점수 규칙 (절대)
- overall_score = grammar_score + vocabulary_score + structure_score + content_score
- 각 영역 0~25 정수
- overall_score 0~100 (반드시 합산값)

## 출력 형식
- 아래 JSON 스키마를 반드시 준수한다.
- 설명 텍스트를 JSON 밖에 절대 출력하지 않는다.

{
  "overall_score": number,
  "grammar_score": number,
  "vocabulary_score": number,
  "structure_score": number,
  "content_score": number,
  "character_count": {
    "total": number,
    "required_min": number,
    "required_max": number,
    "is_sufficient": boolean,
    "note": string
  },
  "swot_analysis": {
    "strengths": [{"title": string, "evidence": string, "analysis": string}],
    "weaknesses": [{"title": string, "issue": string, "impact": string}],
    "opportunities": [{"title": string, "action": string, "benefit": string}],
    "threats": [{"title": string, "risk_level": string, "prevention": string}]
  },
  "corrections": [
    {"original": string, "corrected": string, "explanation": string, "type": "grammar|vocabulary|spelling|structure"}
  ],
  "vocabulary_upgrades": [{"basic": string, "advanced": string, "difference": string}],
  "structure_improvements": [{"current": string, "improved": string, "reason": string}],
  "strengths": string[],
  "improvements": string[],
  "model_answer": string,
  "detailed_feedback": string,
  "next_priority": string[]
}`;
}

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
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Large ArrayBuffer -> base64 safely (avoid "Maximum call stack size exceeded")
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionImageUrl, answerImageUrl, answerText, ocrOnly, userId, uiLanguage } = await req.json();
    const lang = normalizeLang(uiLanguage);

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
          imageData = arrayBufferToBase64(arrayBuffer);
          mimeType = imgResponse.headers.get("content-type") || "image/png";
        } catch (e) {
          console.error("Failed to fetch image for OCR:", e);
          return new Response(JSON.stringify({ extractedText: "" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const ocrResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: "이 이미지에서 한국어 텍스트를 추출해주세요. 손글씨나 타이핑된 텍스트 모두 포함합니다. 텍스트만 출력하고 다른 설명은 하지 마세요. 텍스트가 없으면 빈 문자열을 반환하세요.",
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: imageData,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!ocrResponse.ok) {
        console.error("OCR API error:", await ocrResponse.text());
        return new Response(JSON.stringify({ extractedText: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ocrData = await ocrResponse.json();
      const extractedText = ocrData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      console.log("OCR extracted text length:", extractedText.length);

      return new Response(JSON.stringify({ extractedText: extractedText.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            cache_message: getCacheMessage(lang),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("❌ CACHE MISS - Calling AI for fresh grading");
    }

    // ========== 캐싱 로직 끝 ==========

    const UI_PROMPTS: Record<SupportedLang, { analyze: string; answerImage: string; answerText: string; finish: string; ack: string }> = {
      ko: {
        analyze: "다음 이미지는 TOPIK II 쓰기 문제입니다. 이미지에서 문제를 정확히 읽고 요구사항(글자 수 포함)을 정리하세요.",
        answerImage: "다음은 수험자의 답안(이미지)입니다.",
        answerText: "다음은 수험자의 답안(텍스트)입니다:\n\n",
        finish: "위 규칙을 준수하여 채점하고, 지정된 JSON 형식으로만 결과를 반환하세요.",
        ack: "네, 이해했습니다. TOPIK II 기준으로 엄격하게 채점하고 JSON으로만 반환하겠습니다.",
      },
      vi: {
        analyze: "Đây là đề TOPIK II Writing. Hãy đọc chính xác yêu cầu (bao gồm số ký tự) từ hình ảnh.",
        answerImage: "Đây là bài làm của thí sinh (hình ảnh).",
        answerText: "Đây là bài làm của thí sinh (văn bản):\n\n",
        finish: "Hãy chấm điểm theo quy tắc và chỉ trả về JSON theo định dạng đã quy định.",
        ack: "Vâng, tôi hiểu. Tôi sẽ chấm theo tiêu chuẩn TOPIK II và chỉ trả về JSON.",
      },
      en: {
        analyze: "This is a TOPIK II Writing prompt. Accurately read the task requirements (including character limits) from the image.",
        answerImage: "This is the examinee's answer (image).",
        answerText: "This is the examinee's answer (text):\n\n",
        finish: "Grade strictly using the rules and return ONLY the specified JSON.",
        ack: "Understood. I will grade strictly by TOPIK II standards and return JSON only.",
      },
      ja: {
        analyze: "これはTOPIK IIの作文問題です。画像から課題条件（文字数含む）を正確に読み取ってください。",
        answerImage: "以下は受験者の解答（画像）です。",
        answerText: "以下は受験者の解答（テキスト）です。\n\n",
        finish: "規則に従って採点し、指定されたJSON形式のみで返してください。",
        ack: "了解しました。TOPIK II基準で厳密に採点し、JSONのみ返します。",
      },
      zh: {
        analyze: "这是一道TOPIK II写作题。请从图片中准确读取题目要求（包含字数要求）。",
        answerImage: "以下是考生答案（图片）。",
        answerText: "以下是考生答案（文本）：\n\n",
        finish: "请严格按规则评分，并且只按指定JSON格式返回结果。",
        ack: "明白。我将严格按TOPIK II标准评分，并且只返回JSON。",
      },
      ru: {
        analyze: "Это задание TOPIK II Writing. Точно прочитайте требования (включая лимит символов) по изображению.",
        answerImage: "Ниже — ответ экзаменуемого (изображение).",
        answerText: "Ниже — ответ экзаменуемого (текст):\n\n",
        finish: "Оцените строго по правилам и верните ТОЛЬКО указанный JSON.",
        ack: "Понял. Оценю строго по стандартам TOPIK II и верну только JSON.",
      },
      uz: {
        analyze: "Bu TOPIK II Writing topshirig‘i. Rasmdan talablarni (belgilar soni cheklovi bilan) aniq o‘qing.",
        answerImage: "Quyida imtihon topshiruvchining javobi (rasm) keltirilgan.",
        answerText: "Quyida imtihon topshiruvchining javobi (matn):\n\n",
        finish: "Qoidalarga qat’iy amal qilib baholang va faqat belgilangan JSON ko‘rinishida qaytaring.",
        ack: "Tushunarli. TOPIK II mezonlari bo‘yicha qat’iy baholab, faqat JSON qaytaraman.",
      },
    };

    const ui = UI_PROMPTS[lang];

    // Build the content parts for Gemini
    const contentParts: any[] = [{ text: ui.analyze }];

    // Fetch and convert question image to base64 if URL provided
    if (questionImageUrl) {
      try {
        const imgResponse = await fetch(questionImageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = imgResponse.headers.get("content-type") || "image/png";

        contentParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });
      } catch (e) {
        console.error("Failed to fetch question image:", e);
      }
    }

    if (answerImageUrl) {
      contentParts.push({ text: ui.answerImage });

      try {
        const imgResponse = await fetch(answerImageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = imgResponse.headers.get("content-type") || "image/png";

        contentParts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });
      } catch (e) {
        console.error("Failed to fetch answer image:", e);
      }
    }

    if (answerText) {
      contentParts.push({
        text: `${ui.answerText}${answerText}`,
      });
    }

    contentParts.push({ text: ui.finish });

    console.log(
      "Calling Gemini 2.5 Flash DIRECT API with thinkingBudget: 24576, maxOutputTokens: 65536"
    );

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
              parts: [{ text: getSystemPrompt(lang) }],
            },
            {
              role: "model",
              parts: [{ text: ui.ack }],
            },
            {
              role: "user",
              parts: contentParts,
            },
          ],
          generationConfig: {
            temperature: 0.15, // 일관성 우선
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65536,
            thinkingConfig: {
              thinkingBudget: 24576, // ✅ 모델 상한(0~24576)
            },
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
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
