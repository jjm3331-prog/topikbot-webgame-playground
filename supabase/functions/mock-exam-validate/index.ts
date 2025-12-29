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
  batchSize?: number; // 배치 사이즈 (기본값: 5)
}

interface ValidationResult {
  question_number: number;
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
  correctedQuestion: Question | null;
}

const BATCH_SIZE = 5; // 5문제씩 배치 검증

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
  ]
}

점수가 80점 미만인 문제는 correctedQuestion에 수정된 버전을 제공하세요.`;

// 단일 배치 검증 함수 (Gemini 직접 호출 + 씽킹버젯 최대치)
async function validateBatch(
  questions: Question[],
  examType: string,
  section: string,
  geminiModel: string
): Promise<ValidationResult[]> {
  const userPrompt = `다음 ${examType.toUpperCase()} ${section} 문제들을 검증해주세요:

${JSON.stringify(questions, null, 2)}

각 문제를 철저히 검토하고 검증 결과를 반환하세요.`;

  console.log(`🤖 Calling Gemini ${geminiModel} with thinkingBudget: 24576, maxOutputTokens: 65536`);

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
          topP: 0.95,
          maxOutputTokens: 65536, // 맥스토큰 최대치
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingBudget: 24576, // 씽킹버젯 최대치
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
    console.error("Failed to parse batch validation response:", content.slice(0, 500));
    throw new Error("Failed to parse batch validation response");
  }

  return parsed.validations || [];
}

// 배치 스트리밍 검증 핸들러
async function handleBatchStreamingValidation(
  params: ValidateRequest
): Promise<Response> {
  const encoder = new TextEncoder();
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash"; // 속도를 위해 flash 사용
  const batchSize = params.batchSize || BATCH_SIZE;
  
  // 문제를 배치로 분할
  const batches: Question[][] = [];
  for (let i = 0; i < params.questions.length; i += batchSize) {
    batches.push(params.questions.slice(i, i + batchSize));
  }

  console.log(`📦 Splitting ${params.questions.length} questions into ${batches.length} batches of ${batchSize}`);

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step: string, progress: number, message: string) => {
        try {
          const data = JSON.stringify({ type: "progress", step, progress, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (e) {
          console.error("Failed to send progress:", e);
        }
      };

      const sendHeartbeat = () => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          // Ignore heartbeat errors
        }
      };

      // 하트비트 인터벌 (5초마다)
      const heartbeatInterval = setInterval(sendHeartbeat, 5000);

      try {
        sendProgress("validating", 5, `🔍 AI 검증 시작 (${batches.length}개 배치)`);

        const allValidations: ValidationResult[] = [];
        let passedCount = 0;
        let failedCount = 0;
        let totalScore = 0;

        // 각 배치 순차 검증
        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];
          const batchNum = batchIdx + 1;
          const baseProgress = 10 + (batchIdx / batches.length) * 80;

          sendProgress(
            "validating", 
            baseProgress, 
            `📝 배치 ${batchNum}/${batches.length} 검증 중... (Q${batch[0]?.question_number || '?'}-Q${batch[batch.length - 1]?.question_number || '?'})`
          );

          console.log(`🔍 Validating batch ${batchNum}/${batches.length}: ${batch.length} questions`);

          try {
            const batchResults = await validateBatch(batch, params.examType, params.section, geminiModel);
            
            // 결과 집계
            for (const v of batchResults) {
              allValidations.push(v);
              totalScore += v.score || 0;
              if (v.score >= 80) {
                passedCount++;
              } else {
                failedCount++;
              }
            }

            // 배치 완료 알림
            const batchData = JSON.stringify({
              type: "batch_complete",
              batchNumber: batchNum,
              totalBatches: batches.length,
              validations: batchResults,
              passedCount,
              failedCount,
            });
            controller.enqueue(encoder.encode(`data: ${batchData}\n\n`));

            console.log(`✅ Batch ${batchNum} complete: ${batchResults.length} validated, ${passedCount} passed so far`);

          } catch (batchError: any) {
            console.error(`❌ Batch ${batchNum} failed:`, batchError.message);
            
            // 배치 실패해도 계속 진행
            const errorData = JSON.stringify({
              type: "batch_error",
              batchNumber: batchNum,
              error: batchError.message,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            
            failedCount += batch.length;
          }

          // 배치 간 짧은 딜레이 (Rate limit 방지)
          if (batchIdx < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        clearInterval(heartbeatInterval);

        sendProgress("complete", 100, `✅ 검증 완료: ${passedCount}개 통과, ${failedCount}개 불통과`);

        const overallScore = allValidations.length > 0 
          ? Math.round(totalScore / allValidations.length) 
          : 0;

        const finalData = JSON.stringify({
          type: "complete",
          success: true,
          validations: allValidations,
          overallScore,
          passedCount,
          failedCount,
          summary: `${params.questions.length}개 문제 중 ${passedCount}개 통과 (${failedCount}개 수정 필요)`,
          model: geminiModel,
          batchesProcessed: batches.length,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();

      } catch (error: any) {
        clearInterval(heartbeatInterval);
        console.error("Batch streaming validation error:", error);
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

// Non-streaming 배치 검증
async function handleBatchNonStreamingValidation(
  params: ValidateRequest
): Promise<{ validations: ValidationResult[]; passedCount: number; failedCount: number; overallScore: number; summary: string }> {
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const batchSize = params.batchSize || BATCH_SIZE;
  
  const batches: Question[][] = [];
  for (let i = 0; i < params.questions.length; i += batchSize) {
    batches.push(params.questions.slice(i, i + batchSize));
  }

  console.log(`📦 Non-streaming: ${params.questions.length} questions → ${batches.length} batches`);

  const allValidations: ValidationResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let totalScore = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`🔍 Processing batch ${batchIdx + 1}/${batches.length}`);

    try {
      const batchResults = await validateBatch(batch, params.examType, params.section, geminiModel);
      
      for (const v of batchResults) {
        allValidations.push(v);
        totalScore += v.score || 0;
        if (v.score >= 80) {
          passedCount++;
        } else {
          failedCount++;
        }
      }
    } catch (e: any) {
      console.error(`Batch ${batchIdx + 1} failed:`, e.message);
      failedCount += batch.length;
    }

    // Rate limit 방지
    if (batchIdx < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const overallScore = allValidations.length > 0 
    ? Math.round(totalScore / allValidations.length) 
    : 0;

  return {
    validations: allValidations,
    passedCount,
    failedCount,
    overallScore,
    summary: `${params.questions.length}개 문제 중 ${passedCount}개 통과 (${failedCount}개 수정 필요)`,
  };
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

    const batchSize = params.batchSize || BATCH_SIZE;
    const totalBatches = Math.ceil(params.questions.length / batchSize);

    console.log(`🔍 Validating ${params.questions.length} questions for ${params.examType} ${params.section}`);
    console.log(`📦 Using batch size: ${batchSize}, total batches: ${totalBatches}`);
    console.log(`📡 Stream mode: ${params.stream}`);

    // Handle streaming mode with batch processing
    if (params.stream) {
      return handleBatchStreamingValidation(params);
    }

    // Non-streaming batch mode
    const result = await handleBatchNonStreamingValidation(params);
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    console.log(`✅ Validation complete: ${result.passedCount} passed, ${result.failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        model: geminiModel,
        batchSize,
        totalBatches,
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
