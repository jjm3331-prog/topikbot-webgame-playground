import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct API Keys
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

// TTS Voice Presets
const TTS_PRESETS = {
  exam: {
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica - clear Korean
    stability: 0.8,
    similarity_boost: 0.85,
    style: 0.2,
    speed: 0.9, // Slightly slower for exam
  },
  learning: {
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.3,
    speed: 0.85, // Slower for learners
  },
  natural: {
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - more natural
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    speed: 1.0, // Normal speed
  },
  formal: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George - formal
    stability: 0.9,
    similarity_boost: 0.9,
    style: 0.1,
    speed: 0.95,
  },
};

// RAG Configuration
const RAG_CONFIG = {
  MATCH_THRESHOLD: 0.25,
  MATCH_COUNT: 20,
  RERANK_MODEL: 'rerank-v3.5',
  TOP_N: 8,
  EMBEDDING_MODEL: 'text-embedding-3-large',
  EMBEDDING_DIMENSIONS: 1536,
};

interface GenerateRequest {
  examType: "topik1" | "topik2";
  section: "listening" | "reading" | "writing";
  difficulty: "beginner" | "intermediate" | "advanced";
  topic?: string;
  questionCount: number;
  referenceDocUrl?: string;
  referenceDocContent?: string;
  useRag?: boolean;
  generateAudio?: boolean;
  examRound?: number;
  ttsPreset?: keyof typeof TTS_PRESETS;
  stream?: boolean;
}

interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation_ko: string;
  explanation_en: string;
  explanation_vi: string;
  part_number: number;
  question_number: number;
  grammar_points: string[];
  vocabulary: string[];
  difficulty: string;
  topic: string;
  listening_script?: string;
  question_audio_url?: string;
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.EMBEDDING_MODEL,
      input: text,
      dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Cohere Rerank
async function rerankResults(
  query: string,
  documents: any[],
  topN: number
): Promise<any[]> {
  if (documents.length === 0 || !COHERE_API_KEY) return documents.slice(0, topN);

  const response = await fetch('https://api.cohere.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RAG_CONFIG.RERANK_MODEL,
      query,
      documents: documents.map(d => d.content),
      top_n: Math.min(topN, documents.length),
      return_documents: false,
    }),
  });

  if (!response.ok) {
    console.error('Cohere rerank error, using fallback');
    return documents.slice(0, topN);
  }

  const data = await response.json();
  return data.results.map((result: any) => ({
    ...documents[result.index],
    rerank_score: result.relevance_score,
  }));
}

// RAG Search
async function ragSearch(query: string, supabase: any): Promise<string> {
  try {
    console.log('🔍 RAG search for:', query);
    
    const queryEmbedding = await generateEmbedding(query);
    
    const { data: searchResults, error } = await supabase.rpc(
      'search_knowledge',
      {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
        match_count: RAG_CONFIG.MATCH_COUNT,
      }
    );

    if (error || !searchResults?.length) {
      console.log('No RAG results found');
      return '';
    }

    const rerankedResults = await rerankResults(query, searchResults, RAG_CONFIG.TOP_N);
    
    const context = rerankedResults.map((r: any, i: number) => 
      `[참고자료 ${i + 1}] (${r.document_title || 'TOPIK 자료'})\n${r.content}`
    ).join('\n\n---\n\n');

    console.log(`✅ RAG found ${rerankedResults.length} relevant documents`);
    return context;
  } catch (error) {
    console.error('RAG search error:', error);
    return '';
  }
}

// Generate TTS audio using ElevenLabs with preset
async function generateListeningAudio(
  script: string, 
  questionNumber: number,
  examType: string,
  examRound: number,
  supabase: any,
  preset: keyof typeof TTS_PRESETS = 'exam'
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY || !script) return null;

  try {
    console.log(`🎵 Generating audio for Q${questionNumber} with ${preset} preset...`);
    
    const settings = TTS_PRESETS[preset];
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost,
            style: settings.style,
            speed: settings.speed,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs TTS error:", response.status);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const fileName = `mock-exam/${examType}/${examRound}/listening_q${questionNumber}_${Date.now()}.mp3`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("podcast-audio")
      .getPublicUrl(fileName);

    console.log(`✅ Audio generated for Q${questionNumber}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("TTS generation error:", error);
    return null;
  }
}

// Build system prompt for Gemini
function buildSystemPrompt(params: GenerateRequest, ragContext: string): string {
  const levelInfo = {
    topik1: "TOPIK I (1-2급, 초급-중급 수준)",
    topik2: "TOPIK II (3-6급, 중급-고급 수준)",
  };

  const sectionInfo = {
    listening: "듣기 (Listening)",
    reading: "읽기 (Reading)",
    writing: "쓰기 (Writing)",
  };

  const difficultyInfo = {
    beginner: "초급 (1-2급 수준, 기본 어휘와 간단한 문장 구조)",
    intermediate: "중급 (3-4급 수준, 다양한 주제와 복잡한 문장)",
    advanced: "고급 (5-6급 수준, 전문적 내용과 추상적 개념)",
  };

  let prompt = `당신은 TOPIK(한국어능력시험) 전문 출제위원입니다. 
최고 품질의 TOPIK 모의고사 문제를 생성해야 합니다.

## 출제 조건
- 시험 유형: ${levelInfo[params.examType]}
- 영역: ${sectionInfo[params.section]}
- 난이도: ${difficultyInfo[params.difficulty]}
- 생성할 문제 수: ${params.questionCount}개
${params.topic ? `- 주제/문법: ${params.topic}` : ''}

## 출제 원칙
1. 실제 TOPIK 시험 형식과 100% 동일한 문제 구조
2. 정확한 한국어 문법과 자연스러운 표현
3. 명확하고 교육적인 해설 (한국어, 영어, 베트남어)
4. 각 보기는 합리적이고 난이도에 맞는 오답 선지
5. 문법 포인트와 핵심 어휘 명시

## 문제 유형 가이드`;

  if (params.section === 'reading') {
    prompt += `
### 읽기 영역 문제 유형
- [1~4] 빈칸 완성 (어휘/문법)
- [5~9] 주제/제목 찾기
- [10~13] 글의 내용과 같은 것 고르기
- [14~20] 빈칸 완성 (문맥)
- [21~30] 지문 독해 후 질문 응답

각 문제에는 반드시 지문(읽기 텍스트)이 포함되어야 합니다.`;
  } else if (params.section === 'listening') {
    prompt += `
### 듣기 영역 문제 유형
- [1~4] 그림 고르기 (간단한 대화 듣고 적절한 그림 선택)
- [5~8] 대화 후 행동/장소/이유 찾기
- [9~12] 대화의 내용과 같은 것 고르기
- [13~16] 대화의 주제 파악
- [17~20] 대화 후 적절한 응답 고르기

### 🎵 듣기 스크립트 (listening_script) - 필수!
듣기 문제는 반드시 listening_script 필드에 대화 스크립트를 포함해야 합니다.
예시:
"listening_script": "남자: 오늘 날씨가 어때요?\\n여자: 비가 올 것 같아요. 우산을 가져가세요.\\n남자: 고마워요."

question_text에는 질문만 넣으세요. 예: "남자는 왜 우산을 가져갑니까?"`;
  }

  if (ragContext) {
    prompt += `\n\n## 📚 참고 자료 (RAG 검색 결과)
다음 자료를 참고하여 문제를 출제하세요. 이 자료는 실제 TOPIK 기출문제, 교재, 어휘 목록 등입니다:

${ragContext}

위 참고 자료의 어휘, 문법, 문장 패턴을 활용하여 유사한 스타일의 문제를 생성하세요.`;
  }

  if (params.referenceDocContent) {
    prompt += `\n\n## 📄 업로드된 레퍼런스 문서
다음 문서를 분석하고 이를 기반으로 문제를 생성/변형하세요:

${params.referenceDocContent}

이 레퍼런스를 기반으로:
1. 문제 형식과 스타일을 유지
2. 지정된 난이도(${params.difficulty})에 맞게 변형
3. 새로운 상황/맥락으로 응용
4. 상세한 해설 추가`;
  }

  prompt += `

## 출력 형식
반드시 다음 JSON 형식으로 출력하세요:
{
  "questions": [
    {
      "question_text": "문제 텍스트 (읽기: 지문+질문, 듣기: 질문만)",
      "options": ["① 선지1", "② 선지2", "③ 선지3", "④ 선지4"],
      "correct_answer": 1-4 중 정답 번호,
      "explanation_ko": "상세한 한국어 해설",
      "explanation_en": "Detailed English explanation",
      "explanation_vi": "Giải thích chi tiết bằng tiếng Việt",
      "part_number": 문제 파트 번호,
      "question_number": 문제 번호,
      "grammar_points": ["문법 포인트1", "문법 포인트2"],
      "vocabulary": ["어휘1 (뜻)", "어휘2 (뜻)"],
      "difficulty": "${params.difficulty}",
      "topic": "${params.topic || '일반'}"${params.section === 'listening' ? `,
      "listening_script": "남자: ...\\n여자: ..."` : ''}
    }
  ]
}

모든 필드를 반드시 채우세요. 빈 값이 있으면 안 됩니다.`;

  return prompt;
}

// Streaming handler
async function handleStreamingGeneration(
  params: GenerateRequest,
  ragContext: string,
  supabase: any
): Promise<Response> {
  const encoder = new TextEncoder();
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
  const systemPrompt = buildSystemPrompt(params, ragContext);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send progress update
        const sendProgress = (step: string, progress: number, message: string) => {
          const data = JSON.stringify({ type: "progress", step, progress, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        sendProgress("rag", 20, "📚 RAG 검색 완료");
        
        sendProgress("generating", 30, "🤖 Gemini 2.5 Pro 문제 생성 시작...");

        // Call Gemini with streaming
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [{
                  text: `${systemPrompt}\n\n---\n\n${params.questionCount}개의 ${params.section} 문제를 생성해주세요.
${params.topic ? `주제/문법: ${params.topic}` : ''}
난이도: ${params.difficulty}
모든 문제는 실제 TOPIK 시험과 동일한 형식이어야 합니다.`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 65536,
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

        // Stream the response
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
                  
                  // Send token chunk to client
                  const tokenData = JSON.stringify({ type: "token", content: text, count: chunkCount });
                  controller.enqueue(encoder.encode(`data: ${tokenData}\n\n`));
                  
                  // Update progress periodically
                  if (chunkCount % 20 === 0) {
                    const progress = Math.min(30 + (chunkCount / 5), 80);
                    sendProgress("generating", progress, `🤖 생성 중... (${chunkCount} 토큰)`);
                  }
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        sendProgress("parsing", 85, "📝 생성된 문제 파싱 중...");

        // Parse the complete content
        let parsed: { questions: GeneratedQuestion[] };
        try {
          let jsonContent = fullContent;
          if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
          if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
          if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
          parsed = JSON.parse(jsonContent.trim());
        } catch (e) {
          console.error("Failed to parse Gemini response:", fullContent.slice(0, 500));
          throw new Error("Failed to parse Gemini response as JSON");
        }

        // Validate questions
        let validQuestions = (parsed.questions || []).filter((q) => {
          return (
            q.question_text &&
            Array.isArray(q.options) &&
            q.options.length >= 4 &&
            typeof q.correct_answer === "number" &&
            q.correct_answer >= 1 &&
            q.correct_answer <= 4 &&
            q.explanation_ko
          );
        });

        sendProgress("audio", 90, `✅ ${validQuestions.length}개 문제 생성 완료`);

        // Generate audio for listening questions
        if (params.section === 'listening' && params.generateAudio !== false && ELEVENLABS_API_KEY && params.examRound) {
          sendProgress("audio", 92, "🎵 TTS 음성 생성 중...");
          
          const ttsPreset = params.ttsPreset || 'exam';
          
          for (let i = 0; i < validQuestions.length; i++) {
            const q = validQuestions[i];
            if (q.listening_script) {
              sendProgress("audio", 92 + (i / validQuestions.length) * 6, `🎵 Q${i + 1} 음성 생성 중...`);
              
              const audioUrl = await generateListeningAudio(
                q.listening_script,
                q.question_number || i + 1,
                params.examType,
                params.examRound,
                supabase,
                ttsPreset
              );
              if (audioUrl) {
                validQuestions[i].question_audio_url = audioUrl;
              }
            }
          }
        }

        sendProgress("complete", 100, "🎉 생성 완료!");

        // Send final result
        const finalData = JSON.stringify({
          type: "complete",
          success: true,
          questions: validQuestions,
          ragUsed: !!ragContext,
          ragDocCount: ragContext ? ragContext.split('---').length : 0,
          model: geminiModel,
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();

      } catch (error: any) {
        console.error("Streaming error:", error);
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
    const params: GenerateRequest = await req.json();
    
    console.log("🎯 Mock Exam Generation Request:", {
      examType: params.examType,
      section: params.section,
      difficulty: params.difficulty,
      topic: params.topic,
      questionCount: params.questionCount,
      useRag: params.useRag,
      generateAudio: params.generateAudio,
      ttsPreset: params.ttsPreset,
      stream: params.stream,
      hasReference: !!params.referenceDocContent,
    });

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RAG Search for context
    let ragContext = '';
    if (params.useRag !== false && OPENAI_API_KEY) {
      const searchQuery = `TOPIK ${params.examType === 'topik1' ? 'I' : 'II'} ${params.section} ${params.difficulty} ${params.topic || ''}`.trim();
      ragContext = await ragSearch(searchQuery, supabase);
    }

    // Handle streaming mode
    if (params.stream) {
      return handleStreamingGeneration(params, ragContext, supabase);
    }

    // Non-streaming mode (legacy)
    const systemPrompt = buildSystemPrompt(params, ragContext);
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";

    console.log("🤖 Calling Gemini 2.5 Pro directly...");
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: `${systemPrompt}\n\n---\n\n${params.questionCount}개의 ${params.section} 문제를 생성해주세요.
${params.topic ? `주제/문법: ${params.topic}` : ''}
난이도: ${params.difficulty}
모든 문제는 실제 TOPIK 시험과 동일한 형식이어야 합니다.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65536,
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
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error("No content in Gemini response");
    }

    let parsed: { questions: GeneratedQuestion[] };
    try {
      let jsonContent = content;
      if (jsonContent.startsWith("```json")) jsonContent = jsonContent.slice(7);
      if (jsonContent.startsWith("```")) jsonContent = jsonContent.slice(3);
      if (jsonContent.endsWith("```")) jsonContent = jsonContent.slice(0, -3);
      parsed = JSON.parse(jsonContent.trim());
    } catch (e) {
      console.error("Failed to parse Gemini response:", content);
      throw new Error("Failed to parse Gemini response as JSON");
    }

    let validQuestions = (parsed.questions || []).filter((q) => {
      return (
        q.question_text &&
        Array.isArray(q.options) &&
        q.options.length >= 4 &&
        typeof q.correct_answer === "number" &&
        q.correct_answer >= 1 &&
        q.correct_answer <= 4 &&
        q.explanation_ko
      );
    });

    console.log(`✅ Generated ${validQuestions.length} valid questions`);

    // Generate audio for listening questions
    if (params.section === 'listening' && params.generateAudio !== false && ELEVENLABS_API_KEY && params.examRound) {
      const ttsPreset = params.ttsPreset || 'exam';
      
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        if (q.listening_script) {
          const audioUrl = await generateListeningAudio(
            q.listening_script,
            q.question_number || i + 1,
            params.examType,
            params.examRound,
            supabase,
            ttsPreset
          );
          if (audioUrl) {
            validQuestions[i].question_audio_url = audioUrl;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions: validQuestions,
        ragUsed: !!ragContext,
        ragDocCount: ragContext ? ragContext.split('---').length : 0,
        model: geminiModel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
