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

// TTS Voice Presets - Korean Native Voices (High Quality)
// 여성: Seoyeon - 한국어 네이티브, 자연스럽고 명확한 발음
// 남성: Junwoo - 한국어 네이티브, 자연스럽고 명확한 발음
const KOREAN_VOICES = {
  female: "yoZ06aMxZJJ28mfd3POQ", // Seoyeon - Korean native female
  male: "ODq5zmih8GrVes37Dizd",   // Junwoo - Korean native male
} as const;

const TTS_PRESETS = {
  exam: {
    voiceId: KOREAN_VOICES.female, // Default to female Korean native
    stability: 0.75,
    similarity_boost: 0.85,
    style: 0.15,
    speed: 0.8, // Slower for exam (clear delivery)
  },
  learning: {
    voiceId: KOREAN_VOICES.female,
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.2,
    speed: 0.75, // Even slower for learners
  },
  natural: {
    voiceId: KOREAN_VOICES.male,
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.4,
    speed: 0.9,
  },
  formal: {
    voiceId: KOREAN_VOICES.female,
    stability: 0.85,
    similarity_boost: 0.9,
    style: 0.1,
    speed: 0.85,
  },
} as const;

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
  // 듣기 세부 설정
  listeningQuestionType?: string;
  dialogueLength?: string;
  speakerCount?: string;
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
  question_image_url?: string;
  image_description?: string; // AI가 생성할 이미지 설명
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

// RAG Search - Enhanced for listening scripts
async function ragSearch(
  query: string, 
  supabase: any, 
  section?: string,
  difficulty?: string
): Promise<string> {
  try {
    console.log('🔍 RAG search for:', query);
    
    // For listening section, create specialized queries for script patterns
    const queries: string[] = [query];
    
    if (section === 'listening') {
      // Add specialized listening script queries
      queries.push(
        'TOPIK 듣기 대본 스크립트 대화 패턴',
        'TOPIK listening script 남자 여자 대화',
        '듣기 시험 대화문 예시 스크립트',
        `TOPIK 듣기 ${difficulty === 'beginner' ? '초급' : difficulty === 'advanced' ? '고급' : '중급'} 대화`
      );
    }
    
    // Collect all search results from multiple queries
    const allResults: any[] = [];
    const seenIds = new Set<string>();
    
    for (const q of queries) {
      const queryEmbedding = await generateEmbedding(q);
      
      const { data: searchResults, error } = await supabase.rpc(
        'search_knowledge',
        {
          query_embedding: `[${queryEmbedding.join(',')}]`,
          match_threshold: RAG_CONFIG.MATCH_THRESHOLD,
          match_count: section === 'listening' ? 30 : RAG_CONFIG.MATCH_COUNT, // More results for listening
        }
      );

      if (!error && searchResults?.length) {
        for (const result of searchResults) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            allResults.push(result);
          }
        }
      }
    }

    if (allResults.length === 0) {
      console.log('No RAG results found');
      return '';
    }

    console.log(`📚 Found ${allResults.length} total RAG results`);

    // For listening, prioritize script-related content
    let filteredResults = allResults;
    if (section === 'listening') {
      const scriptPatterns = ['대본', '스크립트', 'script', '남자:', '여자:', '대화', '듣기'];
      const scored = allResults.map(r => {
        let score = r.similarity || 0;
        const content = r.content.toLowerCase();
        
        // Boost score for script-related content
        for (const pattern of scriptPatterns) {
          if (content.includes(pattern.toLowerCase())) {
            score += 0.1;
          }
        }
        
        // Extra boost for actual dialogue patterns
        if (content.includes('남자:') && content.includes('여자:')) {
          score += 0.3;
        }
        if (content.match(/[가-힣]+:\s*[가-힣]/)) {
          score += 0.2;
        }
        
        return { ...r, boosted_score: score };
      });
      
      // Sort by boosted score
      scored.sort((a, b) => b.boosted_score - a.boosted_score);
      filteredResults = scored.slice(0, 40); // Take top 40 for reranking
    }

    // Rerank with listening-specific query
    const rerankQuery = section === 'listening' 
      ? `TOPIK 듣기 대본 스크립트 대화 남자 여자 ${query}`
      : query;
    
    const topN = section === 'listening' ? 12 : RAG_CONFIG.TOP_N; // More context for listening
    const rerankedResults = await rerankResults(rerankQuery, filteredResults, topN);
    
    const context = rerankedResults.map((r: any, i: number) => 
      `[참고자료 ${i + 1}] (${r.document_title || 'TOPIK 자료'})${r.boosted_score ? ` [스코어: ${r.boosted_score.toFixed(2)}]` : ''}\n${r.content}`
    ).join('\n\n---\n\n');

    console.log(`✅ RAG found ${rerankedResults.length} relevant documents (listening enhanced: ${section === 'listening'})`);
    return context;
  } catch (error) {
    console.error('RAG search error:', error);
    return '';
  }
}

// Generate TTS audio using ElevenLabs with preset
// - Removes speaker labels like "남자:"/"여자:" from spoken audio
// - If multiple speakers are detected, alternates voices per speaker and concatenates segments
async function generateListeningAudio(
  script: string,
  questionNumber: number,
  examType: string,
  examRound: number,
  supabase: any,
  preset: keyof typeof TTS_PRESETS = "exam",
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY || !script) return null;

  const detectSpeaker = (raw: string): { speakerKey: "male" | "female" | "other"; text: string } => {
    const line = raw.trim();
    // Examples: "남자:", "여자:", "남:", "여:", "A:", "B:" (Korean/ASCII colons)
    const m = line.match(/^\s*(남자|여자|남성|여성|남|여|A|B|C|D)\s*[:：]\s*(.*)$/i);
    if (!m) return { speakerKey: "other", text: line };

    const label = String(m[1]).toLowerCase();
    const text = String(m[2] ?? "").trim();

    if (["여자", "여성", "여"].includes(label)) return { speakerKey: "female", text };
    if (["남자", "남성", "남"].includes(label)) return { speakerKey: "male", text };

    // A/B/C/D: treat as alternating speakers but default to other
    return { speakerKey: "other", text };
  };

  const stripLeadingId3 = (buf: ArrayBuffer): Uint8Array => {
    const bytes = new Uint8Array(buf);
    // ID3 header: "ID3" + ver(2) + flags(1) + size(4, syncsafe)
    if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const size =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);
      const start = Math.min(bytes.length, 10 + size);
      return bytes.slice(start);
    }
    return bytes;
  };

  const concatBytes = (parts: Uint8Array[]): Uint8Array => {
    const total = parts.reduce((acc, p) => acc + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  };

  try {
    console.log(`🎵 Generating audio for Q${questionNumber} with ${preset} preset...`);

    const baseSettings = TTS_PRESETS[preset];

    // Split into segments (multi-speaker) by line breaks; ignore empty lines
    const rawLines = script
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const segments = rawLines.length
      ? rawLines.map(detectSpeaker).filter((s) => s.text)
      : [{ speakerKey: "other" as const, text: script.trim() }];

    const uniqueSpeakers = new Set(segments.map((s) => s.speakerKey));
    const isMultiSpeaker = uniqueSpeakers.size >= 2 && (uniqueSpeakers.has("male") || uniqueSpeakers.has("female"));

    const voiceBySpeaker: Record<"male" | "female" | "other", string> = {
      female: KOREAN_VOICES.female, // Seoyeon - Korean native female
      male: KOREAN_VOICES.male,     // Junwoo - Korean native male
      other: baseSettings.voiceId,
    };

    // Build audio buffer(s)
    const audioParts: Uint8Array[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const voiceId = isMultiSpeaker ? voiceBySpeaker[seg.speakerKey] : baseSettings.voiceId;

      // Add a short pause between lines by punctuation (natural for TTS)
      const text = seg.text.endsWith(".") || seg.text.endsWith("?") || seg.text.endsWith("!")
        ? `${seg.text} ...`
        : `${seg.text}. ...`;

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: baseSettings.stability,
            similarity_boost: baseSettings.similarity_boost,
            style: baseSettings.style,
            speed: baseSettings.speed,
          },
        }),
      });

      if (!response.ok) {
        const t = await response.text().catch(() => "");
        console.error("ElevenLabs TTS error:", response.status, t);
        return null;
      }

      const buf = await response.arrayBuffer();
      // Strip ID3 on subsequent segments to avoid repeated headers when concatenating
      const bytes = i === 0 ? new Uint8Array(buf) : stripLeadingId3(buf);
      audioParts.push(bytes);
    }

    const finalBytes = audioParts.length === 1 ? audioParts[0] : concatBytes(audioParts);

    const fileName = `mock-exam/${examType}/${examRound}/listening_q${questionNumber}_${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, finalBytes.buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("podcast-audio").getPublicUrl(fileName);

    console.log(`✅ Audio generated for Q${questionNumber} (multiSpeaker: ${isMultiSpeaker})`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("TTS generation error:", error);
    return null;
  }
}

// Generate image for picture dialogue questions [5-8] using Lovable AI (Gemini Image)
async function generateQuestionImage(
  imageDescription: string,
  questionNumber: number,
  examType: string,
  examRound: number,
  supabase: any,
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || !imageDescription) return null;

  try {
    console.log(`🖼️ Generating image for Q${questionNumber}: ${imageDescription.slice(0, 50)}...`);

    // Create a prompt for Korean language test picture dialogue
    const imagePrompt = `Create a simple, clear illustration for a Korean language test (TOPIK). 
The scene: ${imageDescription}
Style requirements:
- Clean, simple line art or illustration style suitable for educational materials
- No text or speech bubbles in the image
- Clear visual elements that match the dialogue context
- Appropriate for all ages
- Similar to official TOPIK test illustrations
- Neutral, professional educational look`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Lovable AI image generation error:", response.status);
      return null;
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      console.error("No valid image in response");
      return null;
    }

    // Extract base64 data and convert to Uint8Array
    const base64Data = imageBase64.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file extension from data URL
    const mimeMatch = imageBase64.match(/data:image\/(\w+);/);
    const extension = mimeMatch ? mimeMatch[1] : "png";

    const fileName = `mock-exam/${examType}/${examRound}/picture_q${questionNumber}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio") // Reuse existing bucket
      .upload(fileName, bytes.buffer, {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("podcast-audio").getPublicUrl(fileName);

    console.log(`✅ Image generated for Q${questionNumber}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Image generation error:", error);
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
    // 듣기 세부 설정 파싱
    const questionType = params.listeningQuestionType || 'mixed';
    const dialogueLen = params.dialogueLength || 'auto';
    const speakers = params.speakerCount || 'auto';

    // 문제 유형별 설정
    const questionTypeGuide: Record<string, { partRange: string; turns: string; description: string }> = {
      "1-4": { partRange: "1~4", turns: "1-2턴", description: "적절한 대답 고르기 (간단한 질문-응답)" },
      "5-8": { partRange: "5~8", turns: "2-3턴", description: "그림 보고 알맞은 대화 고르기" },
      "9-12": { partRange: "9~12", turns: "3-4턴", description: "대화의 장소/화제/목적 파악" },
      "13-16": { partRange: "13~16", turns: "4-6턴", description: "세부 내용 파악" },
      "17-20": { partRange: "17~20", turns: "5-8턴", description: "화자의 의도/태도/후속 행동 파악" },
      "21-30": { partRange: "21~30", turns: "6-10턴", description: "긴 대화/담화 종합 이해" },
    };

    // 대화 길이 설정
    const dialogueLengthGuide: Record<string, string> = {
      short: "짧은 대화 (1-3턴)",
      medium: "중간 대화 (4-6턴)",
      long: "긴 대화 (7-10턴)",
      auto: "문제 유형에 맞는 길이",
    };

    // 화자 수 설정
    const speakerGuide: Record<string, string> = {
      "2": "남자-여자 2인 대화",
      "3": "3인 대화 (남1-여1-남2 또는 남1-여2)",
      "monologue": "1인 담화 (강의, 뉴스, 안내방송 등)",
      "auto": "문제 유형에 맞는 화자 구성",
    };

    prompt += `
### 듣기 영역 문제 유형
${questionType === 'mixed' ? `
- [1~4] 적절한 대답 고르기 (간단한 질문-응답)
- [5~8] 그림 보고 알맞은 대화 고르기
- [9~12] 대화의 장소/화제/목적 파악
- [13~16] 세부 내용 파악 (대화 내용과 같은 것)
- [17~20] 화자의 의도/태도/후속 행동 파악
- [21~30] 긴 대화/담화 듣고 종합적 이해

다양한 유형을 골고루 생성하세요.` : `
⚠️ **지정된 문제 유형**: [${questionTypeGuide[questionType]?.partRange}번 유형]
- 유형: ${questionTypeGuide[questionType]?.description}
- 권장 대화 길이: ${questionTypeGuide[questionType]?.turns}

모든 문제를 이 유형으로 생성하세요.`}

### 🎧 대화 설정
- **대화 길이**: ${dialogueLengthGuide[dialogueLen] || dialogueLengthGuide.auto}
- **화자 구성**: ${speakerGuide[speakers] || speakerGuide.auto}

### 🎵 듣기 스크립트 (listening_script) - 매우 중요!

**반드시 참고자료(RAG)에 있는 실제 TOPIK 듣기 대본 패턴을 참고하여 자연스러운 스크립트를 생성하세요.**

듣기 스크립트 작성 원칙:
1. **화자 표시**: 반드시 "남자:" / "여자:" 또는 "남:" / "여:" 형식 사용${speakers === '3' ? ' (3인: 남1, 여1, 남2 등)' : ''}${speakers === 'monologue' ? ' (1인 담화: "화자:" 또는 내용만)' : ''}
2. **자연스러운 대화**: 실제 한국어 대화처럼 자연스럽게 (축약, 조사 생략 등)
3. **대화 길이**: ${dialogueLen === 'short' ? '1-3턴의 짧은 대화' : dialogueLen === 'medium' ? '4-6턴의 중간 대화' : dialogueLen === 'long' ? '7-10턴의 긴 대화' : '문제 유형에 맞는 적절한 길이'}
4. **맥락 명확성**: 스크립트만 보고도 정답을 논리적으로 도출할 수 있어야 함
5. **오답 선지 타당성**: 오답도 그럴듯해야 하지만, 스크립트에 명확한 근거가 없어야 함

스크립트 예시 (유형별):

[1~4번 유형 - 적절한 대답]
"여자: 오늘 저녁에 뭐 할 거예요?"

[5~8번 유형 - 그림 대화]
"남자: 이 책 어디에 놓을까요?\\n여자: 저 책상 위에 놓아 주세요."

[9~12번 유형 - 장소/화제]
"여자: 어서 오세요. 뭘 찾으세요?\\n남자: 감기약 좀 주세요.\\n여자: 어떤 증상이 있으세요?\\n남자: 기침이 많이 나고 열도 좀 있어요."

[13~16번 유형 - 세부 내용]
"남자: 이번 주말에 산에 갈 건데, 같이 갈래?\\n여자: 좋아. 그런데 날씨가 괜찮을까?\\n남자: 일기예보 봤는데 맑대. 아침 8시에 출발하자.\\n여자: 알았어. 도시락은 내가 준비할게."

[21~30번 유형 - 담화]
"안녕하세요. 오늘 강의에서는 한국의 전통 음식에 대해 알아보겠습니다. 한국 음식은 발효 식품이 많은 것이 특징입니다..."

question_text에는 질문만 넣으세요.
- 좋은 예: "남자는 왜 감기약을 사러 왔습니까?"
- 나쁜 예: "(대화를 듣고) 남자는..." (스크립트는 listening_script에)`;
  }

  if (ragContext) {
    prompt += `\n\n## 📚 참고 자료 (RAG 검색 결과)
다음 자료를 참고하여 문제를 출제하세요. 이 자료는 실제 TOPIK 기출문제, 교재, 어휘 목록 등입니다:

${ragContext}

위 참고 자료의 어휘, 문법, 문장 패턴을 활용하여 유사한 스타일의 문제를 생성하세요.`;

    if (params.section === 'listening') {
      prompt += `

### ⚠️ 듣기 스크립트 생성 시 중요 지침
1. **위 참고자료에서 실제 TOPIK 듣기 대본 패턴을 분석하세요**
2. 대화의 흐름, 화자 교대 패턴, 표현 방식을 참고하세요
3. 참고자료에 있는 대화 구조를 모방하되, 새로운 상황으로 변형하세요
4. 정답이 스크립트에서 명확히 도출되도록 작성하세요
5. 오답 선지는 그럴듯하지만 스크립트와 맞지 않아야 합니다`;
    }
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
      "listening_script": "남자: ...\\n여자: ...",
      "image_description": "[5-8번 그림 문제일 경우만] 그림에 나타나야 할 장면/상황 설명 (예: '책상 위에 책을 놓는 남자와 그것을 가리키는 여자')"` : ''}
    }
  ]
}

⚠️ [5-8번 그림 문제] 필수 지침:
- image_description 필드에 그림으로 그려질 장면을 자세히 한국어로 설명하세요.
- 대화 내용이 시각적으로 표현될 수 있는 장면이어야 합니다.
- 예: "카페에서 커피를 주문하는 손님과 바리스타", "도서관에서 책을 찾는 학생"

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

        sendProgress("audio", 88, `✅ ${validQuestions.length}개 문제 생성 완료`);

        // Generate images for picture dialogue questions [5-8]
        if (params.section === 'listening' && params.listeningQuestionType === '5-8' && params.examRound) {
          sendProgress("image", 89, "🖼️ 그림 문제 이미지 생성 중...");
          
          for (let i = 0; i < validQuestions.length; i++) {
            const q = validQuestions[i];
            if (q.image_description) {
              sendProgress("image", 89 + (i / validQuestions.length) * 3, `🖼️ Q${i + 1} 이미지 생성 중...`);
              
              const imageUrl = await generateQuestionImage(
                q.image_description,
                q.question_number || i + 1,
                params.examType,
                params.examRound,
                supabase
              );
              if (imageUrl) {
                validQuestions[i].question_image_url = imageUrl;
              }
            }
          }
        }

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
      // 듣기 세부 설정
      listeningQuestionType: params.listeningQuestionType,
      dialogueLength: params.dialogueLength,
      speakerCount: params.speakerCount,
    });

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // RAG Search for context - Enhanced for listening section
    let ragContext = '';
    if (params.useRag !== false && OPENAI_API_KEY) {
      const searchQuery = `TOPIK ${params.examType === 'topik1' ? 'I' : 'II'} ${params.section} ${params.difficulty} ${params.topic || ''}`.trim();
      ragContext = await ragSearch(searchQuery, supabase, params.section, params.difficulty);
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
