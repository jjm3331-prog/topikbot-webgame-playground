import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Bạn là chuyên gia dịch thuật Hàn-Việt cao cấp với kiến thức sâu về ngữ pháp TOPIK và tiếng Hàn giao tiếp.

**Nhiệm vụ chính:**
Dịch chính xác giữa tiếng Hàn ↔ tiếng Việt, đồng thời cung cấp thông tin học tập hữu ích.

**Yêu cầu output JSON:**
{
  "translation": "bản dịch chính xác",
  "pronunciation": "phiên âm tiếng Hàn (nếu dịch Hàn→Việt)",
  "romanization": "romanization (nếu dịch Hàn→Việt)",
  "grammar_notes": [
    {
      "pattern": "cấu trúc ngữ pháp",
      "explanation": "giải thích ngắn gọn",
      "level": "TOPIK I/II level"
    }
  ],
  "vocabulary": [
    {
      "word": "từ vựng",
      "meaning": "nghĩa",
      "example": "ví dụ ngắn"
    }
  ],
  "alternative_translations": ["bản dịch thay thế 1", "bản dịch thay thế 2"],
  "usage_context": "ngữ cảnh sử dụng phù hợp",
  "formality_level": "formal/informal/neutral",
  "source_language": "ko/vi",
  "target_language": "vi/ko"
}

**Quy tắc:**
1. Dịch tự nhiên, không dịch máy móc word-by-word
2. Giữ nguyên ý nghĩa và sắc thái của câu gốc
3. Phân tích ngữ pháp hữu ích cho người học TOPIK
4. Cung cấp từ vựng quan trọng với ví dụ
5. Đề xuất 1-2 cách dịch thay thế nếu có
6. Luôn trả về JSON hợp lệ`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, sourceLanguage, targetLanguage } = await req.json();
    
    if (!text || text.trim().length === 0) {
      throw new Error("Text is required");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const sourceLang = sourceLanguage === "ko" ? "tiếng Hàn" : "tiếng Việt";
    const targetLang = targetLanguage === "ko" ? "tiếng Hàn" : "tiếng Việt";

    const userPrompt = `Dịch từ ${sourceLang} sang ${targetLang}:

"${text}"

Hãy dịch và phân tích theo định dạng JSON đã quy định. Đảm bảo JSON hợp lệ.`;

    console.log(`Translating: ${text.substring(0, 50)}... from ${sourceLanguage} to ${targetLanguage}`);

    // Direct Gemini API call with gemini-2.5-flash-lite
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
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt quá giới hạn. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw AI response:", aiResponse.substring(0, 200));

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: return simple translation
      return new Response(
        JSON.stringify({
          translation: aiResponse.trim(),
          pronunciation: "",
          romanization: "",
          grammar_notes: [],
          vocabulary: [],
          alternative_translations: [],
          usage_context: "",
          formality_level: "neutral",
          source_language: sourceLanguage,
          target_language: targetLanguage
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and provide defaults
    const validatedResult = {
      translation: result.translation || "",
      pronunciation: result.pronunciation || "",
      romanization: result.romanization || "",
      grammar_notes: result.grammar_notes || [],
      vocabulary: result.vocabulary || [],
      alternative_translations: result.alternative_translations || [],
      usage_context: result.usage_context || "",
      formality_level: result.formality_level || "neutral",
      source_language: sourceLanguage,
      target_language: targetLanguage,
      model: "gemini-2.5-flash-lite"
    };

    console.log(`Translation successful: ${validatedResult.translation.substring(0, 50)}...`);

    return new Response(
      JSON.stringify(validatedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in translate-ko-vi:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
