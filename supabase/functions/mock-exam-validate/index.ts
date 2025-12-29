import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct Gemini API Key
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface Question {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation_ko: string;
  explanation_en?: string;
  explanation_vi?: string;
  part_number: number;
  question_number: number;
  grammar_points?: string[];
  vocabulary?: string[];
  difficulty: string;
  topic?: string;
  listening_script?: string;
}

interface ValidateRequest {
  questions: Question[];
  examType: string;
  section: string;
  stream?: boolean;
}

// Streaming handler for validation
async function handleStreamingValidation(
  params: ValidateRequest
): Promise<Response> {
  const encoder = new TextEncoder();
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";

  const systemPrompt = `당신은 TOPIK(한국어능력시험) 검수 전문가입니다.
생성된 모의고사 문제의 품질을 검증하고 필요시 수정해야 합니다.

## 검증 기준

### 1. 한국어 정확성 (30점)
- 맞춤법/띄어쓰기 오류
- 문법적 오류
- 자연스러운 표현

### 2. 문제 형식 (20점)
- TOPIK 공식 형식 준수
- 지문과 질문의 명확성
- 보기 형식의 일관성 (①②③④)

### 3. 정답 정확성 (30점)
- 정답이 유일하게 맞는 답인지
- 오답 선지들이 합리적인지
- 정답 번호와 실제 정답 일치 여부

### 4. 해설 품질 (20점)
- 해설이 정답을 잘 설명하는지
- 다국어 해설 일관성
- 학습에 도움이 되는 내용

## 출력 형식
각 문제에 대해 다음 JSON 형식으로 검증 결과를 반환하세요:
{
  "validations": [
    {
      "question_number": 문제 번호,
      "isValid": true/false,
      "score": 0-100 점수,
      "issues": ["발견된 문제점 1", "문제점 2"],
      "suggestions": ["개선 제안 1", "제안 2"],
      "correctedQuestion": null 또는 수정된 문제 객체 (수정이 필요한 경우)
    }
  ],
  "overallScore": 전체 평균 점수,
  "passedCount": 통과 문제 수 (score >= 80),
  "failedCount": 불통과 문제 수,
  "summary": "전체 검증 요약"
}

점수가 80점 미만인 문제는 correctedQuestion에 수정된 버전을 제공하세요.`;

  const userPrompt = `다음 ${params.examType.toUpperCase()} ${params.section} 문제들을 검증해주세요:

${JSON.stringify(params.questions, null, 2)}

각 문제를 철저히 검토하고 검증 결과를 반환하세요.`;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendProgress = (step: string, progress: number, message: string) => {
          const data = JSON.stringify({ type: "progress", step, progress, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        sendProgress("validating", 10, "🔍 AI 검증 시작...");

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
              }],
              generationConfig: {
                temperature: 0.3,
                topP: 0.9,
                maxOutputTokens: 32768,
                responseMimeType: "application/json",
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

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }

        const reader = geminiResponse.body?.getReader();
        if (!reader) throw new Error("No response body");

        let fullContent = "";
        let chunkCount = 0;
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === '[DONE]') continue;
                
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (text) {
                  fullContent += text;
                  chunkCount++;
                  
                  const tokenData = JSON.stringify({ type: "token", content: text, count: chunkCount });
                  controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));
                  
                  if (chunkCount % 15 === 0) {
                    const progress = Math.min(10 + (chunkCount / 3), 85);
                    sendProgress("validating", progress, `🔍 검증 중... (${chunkCount} 토큰)`);
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        sendProgress("parsing", 90, "📝 검증 결과 파싱 중...");

        let parsed;
        try {
          let jsonContent = fullContent;
          if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
          if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
          if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
          parsed = JSON.parse(jsonContent.trim());
        } catch (e) {
          console.error("Failed to parse validation response:", fullContent.slice(0, 500));
          throw new Error("Failed to parse validation response");
        }

        sendProgress("complete", 100, `✅ 검증 완료: ${parsed.passedCount}개 통과`);

        const finalData = JSON.stringify({
          type: "complete",
          success: true,
          ...parsed,
          model: geminiModel,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();

      } catch (error: any) {
        console.error("Streaming validation error:", error);
        const errorData = JSON.stringify({ type: "error", error: error.message });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: ValidateRequest = await req.json();

    if (!params.questions || !Array.isArray(params.questions) || params.questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Questions array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    console.log(`🔍 Validating ${params.questions.length} questions for ${params.examType} ${params.section}, stream: ${params.stream}`);

    // Handle streaming mode
    if (params.stream) {
      return handleStreamingValidation(params);
    }

    // Non-streaming mode
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";

    const systemPrompt = `당신은 TOPIK(한국어능력시험) 검수 전문가입니다.
생성된 모의고사 문제의 품질을 검증하고 필요시 수정해야 합니다.

## 검증 기준

### 1. 한국어 정확성 (30점)
- 맞춤법/띄어쓰기 오류
- 문법적 오류
- 자연스러운 표현

### 2. 문제 형식 (20점)
- TOPIK 공식 형식 준수
- 지문과 질문의 명확성
- 보기 형식의 일관성 (①②③④)

### 3. 정답 정확성 (30점)
- 정답이 유일하게 맞는 답인지
- 오답 선지들이 합리적인지
- 정답 번호와 실제 정답 일치 여부

### 4. 해설 품질 (20점)
- 해설이 정답을 잘 설명하는지
- 다국어 해설 일관성
- 학습에 도움이 되는 내용

## 출력 형식
각 문제에 대해 다음 JSON 형식으로 검증 결과를 반환하세요:
{
  "validations": [
    {
      "question_number": 문제 번호,
      "isValid": true/false,
      "score": 0-100 점수,
      "issues": ["발견된 문제점 1", "문제점 2"],
      "suggestions": ["개선 제안 1", "제안 2"],
      "correctedQuestion": null 또는 수정된 문제 객체 (수정이 필요한 경우)
    }
  ],
  "overallScore": 전체 평균 점수,
  "passedCount": 통과 문제 수 (score >= 80),
  "failedCount": 불통과 문제 수,
  "summary": "전체 검증 요약"
}

점수가 80점 미만인 문제는 correctedQuestion에 수정된 버전을 제공하세요.`;

    const userPrompt = `다음 ${params.examType.toUpperCase()} ${params.section} 문제들을 검증해주세요:

${JSON.stringify(params.questions, null, 2)}

각 문제를 철저히 검토하고 검증 결과를 반환하세요.`;

    console.log("🤖 Calling Gemini for validation...");
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
          }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    let parsed;
    try {
      let jsonContent = content;
      if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
      if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
      if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
      parsed = JSON.parse(jsonContent.trim());
    } catch (e) {
      console.error("Failed to parse validation response:", content);
      throw new Error("Failed to parse validation response");
    }

    console.log(`✅ Validation complete: ${parsed.passedCount} passed, ${parsed.failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsed,
        model: geminiModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
