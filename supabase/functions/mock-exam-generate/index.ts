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
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

// ============================================
// ElevenLabs Korean Native Voice Presets (복구)
// ============================================
// 기존에 사용하던 커스텀 한국어 네이티브 보이스 ID
const ELEVENLABS_VOICES = {
  female: "ksaI0TCD9BstzEzlxj4q",
  male: "WqVy7827vjE2r3jWvbnP",
} as const;

// TTS Presets for different use cases
const TTS_PRESETS = {
  exam: {
    voiceFemale: ELEVENLABS_VOICES.female,
    voiceMale: ELEVENLABS_VOICES.male,
    // ElevenLabs는 별도 스타일 프롬프트를 받지 않으므로 로그/설명용
    prompt: "TOPIK 시험용: 명확하고 또렷한 발음, 중간 속도",
  },
  learning: {
    voiceFemale: ELEVENLABS_VOICES.female,
    voiceMale: ELEVENLABS_VOICES.male,
    prompt: "학습용: 천천히 또렷하게",
  },
  natural: {
    voiceFemale: ELEVENLABS_VOICES.female,
    voiceMale: ELEVENLABS_VOICES.male,
    prompt: "자연스러운 대화 톤",
  },
  formal: {
    voiceFemale: ELEVENLABS_VOICES.female,
    voiceMale: ELEVENLABS_VOICES.male,
    prompt: "격식 있는 톤",
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
  // [1-3번] 그림 문제용 - 4개 이미지 URL
  option_images?: string[];
  // [1-3번] 그림 문제용 - 4개 장면/그래프 설명 (AI 이미지 생성용)
  option_image_descriptions?: string[];
  // [1-3번] 그림 문제 유형: "scene" (장면/행동) 또는 "graph" (그래프/도표)
  picture_type?: "scene" | "graph";
  // [21-50번] 세트형 문제용 - 같은 세트 ID는 동일한 스크립트를 공유
  set_id?: string;
  // [21-50번] 세트 내 질문 유형: intent(의도), detail(세부내용), central_idea(중심생각), attitude(태도), speaking_style(말하는 방식)
  question_type_in_set?: "intent" | "detail" | "central_idea" | "attitude" | "speaking_style";
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

// Generate TTS audio using ElevenLabs (복구)
// - Removes speaker labels like "남자:"/"여자:" from spoken audio
// - If multiple speakers are detected, alternates voices per speaker and concatenates MP3 segments

async function synthesizeElevenLabsTTS(
  text: string,
  voiceId: string,
): Promise<Uint8Array> {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          // 기존 세팅값 복구
          stability: 1.0,
          similarity_boost: 0.9,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("ElevenLabs TTS error:", resp.status, t);
    throw new Error(`ElevenLabs TTS failed (${resp.status})`);
  }

  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

async function generateListeningAudio(
  script: string,
  questionNumber: number,
  examType: string,
  supabase: any,
  preset: keyof typeof TTS_PRESETS = "exam",
): Promise<string | null> {
  if (!script) return null;

  const presetCfg = TTS_PRESETS[preset] ?? TTS_PRESETS.exam;

  const detectSpeaker = (raw: string): { speakerKey: "male" | "female" | "other"; text: string } => {
    const line = raw.trim();
    const m = line.match(/^\s*(남자|여자|남성|여성|남|여|A|B|C|D)\s*[:：]\s*(.*)$/i);
    if (!m) return { speakerKey: "other", text: line };

    const label = String(m[1]).toLowerCase();
    const text = String(m[2] ?? "").trim();

    if (["여자", "여성", "여"].includes(label)) return { speakerKey: "female", text };
    if (["남자", "남성", "남"].includes(label)) return { speakerKey: "male", text };
    return { speakerKey: "other", text };
  };

  const stripLeadingId3 = (buf: ArrayBufferLike): Uint8Array => {
    const bytes = new Uint8Array(buf);
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
    console.log(`🎵 Generating ElevenLabs TTS audio for Q${questionNumber} preset=${preset}...`);

    const rawLines = script
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const segments = rawLines.length
      ? rawLines.map(detectSpeaker).filter((s) => s.text)
      : [{ speakerKey: "other" as const, text: script.trim() }];

    const uniqueSpeakers = new Set(segments.map((s) => s.speakerKey));
    const isMultiSpeaker =
      uniqueSpeakers.size >= 2 && (uniqueSpeakers.has("male") || uniqueSpeakers.has("female"));

    let finalBytes: Uint8Array;

    if (isMultiSpeaker) {
      const audioParts: Uint8Array[] = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const voiceId = seg.speakerKey === "male" ? presetCfg.voiceMale : presetCfg.voiceFemale;

        const t = seg.text.endsWith(".") || seg.text.endsWith("?") || seg.text.endsWith("!")
          ? seg.text
          : `${seg.text}.`;

        const bytes = await synthesizeElevenLabsTTS(t, voiceId);
        const withoutId3 = i === 0 ? bytes : stripLeadingId3(bytes.buffer);
        audioParts.push(withoutId3);
      }

      finalBytes = audioParts.length === 1 ? audioParts[0] : concatBytes(audioParts);
    } else {
      // Single voice: 그대로 합성
      finalBytes = await synthesizeElevenLabsTTS(script.trim(), presetCfg.voiceFemale);
    }

    const fileName = `mock-exam/${examType}/listening_q${questionNumber}_${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, finalBytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("podcast-audio").getPublicUrl(fileName);
    console.log(`✅ ElevenLabs TTS audio generated for Q${questionNumber}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("ElevenLabs TTS generation error:", error);
    return null;
  }
}
/**
 * TOPIK II 듣기 그림 문제 유형 (1-3번 문항)
 * 
 * 문항 1-2: 장면/행동 그림 (Scene Pictures)
 *   - 대화 듣고 4개 그림 중 알맞은 것 선택
 *   - 만화/일러스트 스타일, 흑백 또는 컬러
 *   - 인물의 행동, 상황 묘사
 * 
 * 문항 3: 그래프/도표 그림 (Graph/Chart Pictures)
 *   - 담화(뉴스, 강연) 듣고 알맞은 그래프/도표 선택
 *   - 선 그래프 + 원형 차트 조합
 *   - 통계 데이터, 수치 비교
 */

// 그림 문제 유형 정의
type PictureQuestionType = "scene" | "graph";

interface PictureQuestionConfig {
  type: PictureQuestionType;
  questionNumbers: number[];  // 문항 번호
  description: string;
  imageStyle: string;
}

const TOPIK2_PICTURE_QUESTION_TYPES: PictureQuestionConfig[] = [
  {
    type: "scene",
    questionNumbers: [1, 2],
    description: "장면/행동 그림 - 대화 듣고 알맞은 그림 선택",
    imageStyle: "만화/일러스트 스타일, 교육용 흑백 또는 간단한 컬러"
  },
  {
    type: "graph",
    questionNumbers: [3],
    description: "그래프/도표 - 담화 듣고 알맞은 통계 그래프 선택",
    imageStyle: "선 그래프 + 원형 차트 조합, 깔끔한 비즈니스 스타일"
  }
];

// Generate image for SCENE type picture questions (문항 1-2)
async function generateSceneImage(
  sceneDescription: string,
  questionNumber: number,
  optionNumber: number,
  examType: string,
  supabase: any,
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || !sceneDescription) return null;

  try {
    console.log(`🎨 [Scene Q${questionNumber}-${optionNumber}] ${sceneDescription.slice(0, 50)}...`);

    // TOPIK 스타일 장면 그림 프롬프트
    const imagePrompt = `Create a TOPIK Korean language test illustration.

Scene to illustrate: ${sceneDescription}

CRITICAL STYLE REQUIREMENTS:
1. Simple, clean LINE ART illustration (like official TOPIK test images)
2. Educational material style - suitable for language testing
3. NO text, NO speech bubbles, NO Korean/English words anywhere
4. Black and white or simple grayscale (like newspaper illustrations)
5. Clear, distinct actions that can be easily identified
6. 2D flat style, NOT 3D or photorealistic
7. Character proportions: simple, clear, cartoon-like
8. Background: minimal, just enough context for the scene
9. The illustration should look like it belongs in an official Korean language proficiency test

Reference style: Similar to TOPIK listening section picture dialogues - simple educational illustrations showing everyday situations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`Scene image API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      console.error("No valid scene image in response");
      return null;
    }

    // Upload to storage
    const base64Data = imageBase64.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const mimeMatch = imageBase64.match(/data:image\/(\w+);/);
    const extension = mimeMatch ? mimeMatch[1] : "png";
    const fileName = `mock-exam/${examType}/scene_q${questionNumber}_opt${optionNumber}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, bytes.buffer, {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Scene image upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("podcast-audio").getPublicUrl(fileName);
    console.log(`✅ Scene image Q${questionNumber}-${optionNumber} uploaded`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Scene image generation error:", error);
    return null;
  }
}

// Generate image for GRAPH type picture questions (문항 3)
async function generateGraphImage(
  graphDescription: string,
  questionNumber: number,
  optionNumber: number,
  examType: string,
  supabase: any,
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || !graphDescription) return null;

  try {
    console.log(`📊 [Graph Q${questionNumber}-${optionNumber}] ${graphDescription.slice(0, 50)}...`);

    // TOPIK 스타일 그래프/도표 프롬프트
    const imagePrompt = `Create a TOPIK Korean language test GRAPH/CHART combination image.

Chart data to visualize: ${graphDescription}

CRITICAL REQUIREMENTS:
1. LAYOUT: The image must contain TWO charts side by side:
   - TOP or LEFT: A LINE GRAPH with title "서비스 이용자 수" (Service Users)
   - BOTTOM or RIGHT: A PIE/DONUT CHART with title "서비스를 이용하는 이유" (Reasons for Using Service)

2. LINE GRAPH specifications:
   - X-axis: Years (2020, 2021, 2022, 2023)
   - Y-axis: Numbers in 만명 (ten thousands) from 0-12
   - Show the trend described in the data
   - Korean labels: (만명) for y-axis, (연도) for x-axis

3. PIE/DONUT CHART specifications:
   - Show percentage breakdown for reasons
   - Labels should be in Korean with percentages
   - Common reasons: 신선하고 품질이 좋아서 (Fresh/Good quality), 가격이 합리적이어서 (Reasonable price), 편리해서 (Convenient)

4. STYLE:
   - Clean, professional business chart style
   - Grayscale or minimal colors
   - Clear Korean text labels
   - Like official TOPIK II test materials

5. NO decorative elements, just clean data visualization

The graphs must clearly match the data described. Different options should show different trends or percentage distributions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`Graph image API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
      console.error("No valid graph image in response");
      return null;
    }

    // Upload to storage
    const base64Data = imageBase64.split(",")[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const mimeMatch = imageBase64.match(/data:image\/(\w+);/);
    const extension = mimeMatch ? mimeMatch[1] : "png";
    const fileName = `mock-exam/${examType}/graph_q${questionNumber}_opt${optionNumber}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("podcast-audio")
      .upload(fileName, bytes.buffer, {
        contentType: `image/${extension}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Graph image upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from("podcast-audio").getPublicUrl(fileName);
    console.log(`✅ Graph image Q${questionNumber}-${optionNumber} uploaded`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Graph image generation error:", error);
    return null;
  }
}

// Unified function to generate picture question images based on type
async function generatePictureQuestionImage(
  description: string,
  questionNumber: number,
  optionNumber: number,
  pictureType: PictureQuestionType,
  examType: string,
  supabase: any,
): Promise<string | null> {
  if (pictureType === "graph") {
    return generateGraphImage(description, questionNumber, optionNumber, examType, supabase);
  } else {
    return generateSceneImage(description, questionNumber, optionNumber, examType, supabase);
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
    const questionTypeGuide: Record<string, { partRange: string; turns: string; description: string; isSet?: boolean }> = {
      "1-4": { partRange: "1~4", turns: "1-2턴", description: "적절한 대답 고르기 (간단한 질문-응답)" },
      "5-8": { partRange: "5~8", turns: "2-3턴", description: "그림 보고 알맞은 대화 고르기" },
      "9-12": { partRange: "9~12", turns: "3-4턴", description: "대화의 장소/화제/목적 파악" },
      "13-16": { partRange: "13~16", turns: "4-6턴", description: "세부 내용 파악" },
      "17-20": { partRange: "17~20", turns: "5-8턴", description: "화자의 의도/태도/후속 행동 파악" },
      "21-50-set": { partRange: "21~50", turns: "6-10턴", description: "세트형 문제 (2문항 1세트, 대화/담화 공유)", isSet: true },
    };

    const isSetQuestion = questionType === '21-50-set';

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
- [21~50] 세트형 문제 (2문항 1세트)

다양한 유형을 골고루 생성하세요.` : isSetQuestion ? `
⚠️ **세트형 문제 생성 (2문항 1세트)**

TOPIK II 듣기 영역 21~50번은 **세트형 문제**입니다.
하나의 대화 또는 담화를 듣고 2개의 문제에 답하는 형식입니다.

**세트형 문제 구조:**
- 각 세트는 반드시 2문제로 구성
- 같은 세트의 2문제는 **동일한 listening_script**를 공유
- set_id 필드로 같은 세트임을 표시 (예: "set_1", "set_2")

**실제 TOPIK II 세트형 문제 유형 (참고용):**

[23~24] 일상 대화 세트
- 질문1: "남자가 무엇을 하고 있는지 고르십시오." (의도/행동)
- 질문2: "들은 내용과 같은 것을 고르십시오." (세부 내용)
- 예시 대화: 박물관 전시실 설명 오류 수정 요청

[25~26] 인터뷰/대담 세트
- 질문1: "남자의 중심 생각으로 가장 알맞은 것을 고르십시오." (중심 생각)
- 질문2: "들은 내용과 같은 것을 고르십시오." (세부 내용)
- 예시 대화: 경찰서장과의 검거율 인터뷰

[47~48] 토론/논설 세트 (고급)
- 질문1: "들은 내용과 같은 것을 고르십시오." (세부 내용)
- 질문2: "남자의 태도로 알맞은 것을 고르십시오." (태도)
- 예시 담화: 사외 이사 제도에 대한 토론

[49~50] 강연/발표 세트 (고급)
- 질문1: "들은 내용과 같은 것을 고르십시오." (세부 내용)
- 질문2: "남자가 말하는 방식으로 알맞은 것을 고르십시오." (말하기 방식)
- 예시 담화: 누리호 위성 발사 관련 강연` : `
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
${isSetQuestion ? `
6. **세트 문제 주의사항**: 같은 세트의 2문제는 **동일한 listening_script**를 공유
7. 첫 번째 문제와 두 번째 문제는 서로 다른 질문 유형이어야 함 (예: 의도+세부내용, 중심생각+세부내용)` : ''}

스크립트 예시 (유형별):

[1~4번 유형 - 적절한 대답]
"여자: 오늘 저녁에 뭐 할 거예요?"

[5~8번 유형 - 그림 대화]
"남자: 이 책 어디에 놓을까요?\\n여자: 저 책상 위에 놓아 주세요."

[9~12번 유형 - 장소/화제]
"여자: 어서 오세요. 뭘 찾으세요?\\n남자: 감기약 좀 주세요.\\n여자: 어떤 증상이 있으세요?\\n남자: 기침이 많이 나고 열도 좀 있어요."

[13~16번 유형 - 세부 내용]
"남자: 이번 주말에 산에 갈 건데, 같이 갈래?\\n여자: 좋아. 그런데 날씨가 괜찮을까?\\n남자: 일기예보 봤는데 맑대. 아침 8시에 출발하자.\\n여자: 알았어. 도시락은 내가 준비할게."
${isSetQuestion ? `
[21~50번 유형 - 세트형 담화/대화]
"남자: 방금 3층 상설 전시관에서 관람하고 내려왔는데요. 전시관에 써 놓은 설명 내용에 잘못된 게 있어서요.\\n여자: 죄송합니다. 뭐가 잘못되어 있나요?\\n남자: 첫 번째 전시실을 소개하는 영어 설명 중에 틀린 단어가 하나 있더라고요. 박물관에 외국인도 많던데 빨리 고쳐 주시면 좋겠어요.\\n여자: 말씀해 주셔서 감사합니다. 바로 올라가서 확인해 보겠습니다."
` : ''}
[담화형 - 강연/뉴스]
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

  // 세트형 문제 여부 확인
  const isSetQuestion = params.listeningQuestionType === '21-50-set';

prompt += `

## 📝 해설 작성 가이드 (매우 중요!)

### 한국어 해설 (explanation_ko) - 반드시 200자 이상!

한국어 해설은 다음 구조로 **상세하게** 작성하세요:

**필수 포함 요소 (6가지):**
1. **문제 유형 설명**: "이 문제는 ~을/를 묻는 문제입니다."
2. **정답 분석**: "정답은 ①번입니다. [정답이 맞는 이유를 구체적으로 설명]"
3. **오답 분석**: 나머지 3개 선지가 왜 틀린지 각각 설명
4. **핵심 문법/어휘**: 문제에 나온 핵심 문법이나 어휘의 의미와 사용법 설명
5. **예문 제시**: 관련 문법/어휘를 사용한 추가 예문 1-2개
6. **학습 팁**: 유사 문제를 풀 때 도움이 되는 팁

**한국어 해설 예시 (280자):**
\`\`\`
이 문제는 장소를 나타내는 조사 '에'와 '에서'의 차이를 묻는 문제입니다.

정답은 ③번 '에서'입니다. '에서'는 동작이 일어나는 장소를 나타낼 때 사용합니다. "도서관에서 책을 읽다"처럼 '읽다'라는 동작이 일어나는 곳이므로 '에서'가 적절합니다.

오답 분석:
① '에'는 존재/위치를 나타냄 (도서관에 있다)
② '으로'는 방향/도구를 나타냄 (버스로 가다)
④ '까지'는 도착점을 나타냄 (학교까지 걸어가다)

💡 학습 팁: '~하다' 동사 앞에는 '에서', '있다/없다' 앞에는 '에'를 사용하세요!
추가 예문: "카페에서 커피를 마시다" / "집에 텔레비전이 있다"
\`\`\`

### 영어/베트남어 해설 - 해당 언어로 자연스럽게 번역

explanation_en, explanation_vi는 한국어 해설을 정확히 번역하되, 해당 언어 사용자에게 자연스럽게 작성하세요.

## 출력 형식
반드시 다음 JSON 형식으로 출력하세요:
{
  "questions": [
    {
      "question_text": "문제 텍스트 (읽기: 지문+질문, 듣기: 질문만)",
      "options": ["① 선지1", "② 선지2", "③ 선지3", "④ 선지4"],
      "correct_answer": 1-4 중 정답 번호,
      "explanation_ko": "200자 이상의 상세한 한국어 해설 (위 가이드 참고)",
      "explanation_en": "Detailed English explanation (translation of Korean)",
      "explanation_vi": "Giải thích chi tiết bằng tiếng Việt (dịch từ tiếng Hàn)",
      "part_number": 문제 파트 번호,
      "question_number": 문제 번호,
      "grammar_points": ["문법 포인트1", "문법 포인트2"],
      "vocabulary": ["어휘1 (뜻)", "어휘2 (뜻)"],
      "difficulty": "${params.difficulty}",
      "topic": "${params.topic || '일반'}"${params.section === 'listening' ? `,
      "listening_script": "남자: ...\\n여자: ..."${isSetQuestion ? `,
      "set_id": "set_1 또는 set_2 등 (같은 세트는 같은 ID)",
      "question_type_in_set": "intent/detail/attitude/speaking_style 중 하나"` : ''}${params.listeningQuestionType === '5-8' ? `,
      "picture_type": "scene 또는 graph",
      "option_image_descriptions": [
        "보기 ① 설명",
        "보기 ② 설명",
        "보기 ③ 설명",
        "보기 ④ 설명"
      ]` : ''}` : ''}
    }
  ]
}

${isSetQuestion ? `
⚠️ [21~50번 세트형 문제] 필수 지침 - TOPIK II 실제 시험 형식 준수!

## 📌 세트형 문제 구조

세트형 문제는 **2문항이 1세트**로 구성됩니다.
같은 세트의 문제는 **동일한 listening_script**와 **동일한 set_id**를 공유합니다.

### 질문 유형 (question_type_in_set)

1. **intent** - 의도/행동 파악
   - "남자가 무엇을 하고 있는지 고르십시오."
   - "남자가 여자에게 부탁한 것을 고르십시오."
   - "이 대화에서 남자가 하려는 말을 고르십시오."

2. **detail** - 세부 내용 파악
   - "들은 내용과 같은 것을 고르십시오."
   - "들은 내용과 다른 것을 고르십시오."

3. **central_idea** - 중심 생각
   - "남자의 중심 생각으로 가장 알맞은 것을 고르십시오."
   - "여자의 주장으로 가장 알맞은 것을 고르십시오."

4. **attitude** - 태도 파악
   - "남자의 태도로 알맞은 것을 고르십시오."
   - 태도 보기 예시: 
     - "① 제도의 필요성과 의의를 강조하고 있다."
     - "② 제도의 지나친 확대 적용을 경계하고 있다."
     - "③ 제도의 한계를 지적하며 개선책을 촉구하고 있다."
     - "④ 제도의 내용을 언급하며 사회적 관심을 호소하고 있다."

5. **speaking_style** - 말하는 방식
   - "남자가 말하는 방식으로 알맞은 것을 고르십시오."
   - 방식 보기 예시:
     - "① 발사 시각이 정해진 배경을 과학적으로 설명하고 있다."
     - "② 우주선 발사의 과학사적 의미를 새롭게 정의하고 있다."
     - "③ 위성이 우주에서 일으킬 수 있는 문제를 예측하고 있다."
     - "④ 천문학적 지식을 토대로 문제 해결 방법을 제시하고 있다."

### 세트 조합 패턴 (참고)

- **[23~24형]**: intent + detail (일상 대화)
- **[25~26형]**: central_idea + detail (인터뷰/대담)
- **[47~48형]**: detail + attitude (토론/논설)
- **[49~50형]**: detail + speaking_style (강연/발표)

### 예시 출력 (4문제 = 2세트)

\`\`\`json
{
  "questions": [
    {
      "question_number": 23,
      "set_id": "set_1",
      "question_type_in_set": "intent",
      "question_text": "남자가 무엇을 하고 있는지 고르십시오.",
      "listening_script": "남자: 방금 3층 상설 전시관에서 관람하고 내려왔는데요...",
      "options": ["① 박물관 단체 관람을 예약하고 있다.", "② 박물관 관람 시간에 대해 문의하고 있다.", "③ 상설 전시회가 열리는 장소를 확인하고 있다.", "④ 전시실의 설명을 수정해 달라고 요청하고 있다."],
      "correct_answer": 4
    },
    {
      "question_number": 24,
      "set_id": "set_1",
      "question_type_in_set": "detail",
      "question_text": "들은 내용과 같은 것을 고르십시오.",
      "listening_script": "남자: 방금 3층 상설 전시관에서 관람하고 내려왔는데요...",
      "options": ["① 여자는 지금 박물관 3층에 있다.", "② 남자는 박물관에서 상설 전시회를 관람했다.", "③ 이 박물관에는 전시실에 영어 설명이 없다.", "④ 이 박물관에는 외국인들이 많이 오지 않는다."],
      "correct_answer": 2
    },
    {
      "question_number": 25,
      "set_id": "set_2",
      "question_type_in_set": "central_idea",
      "question_text": "남자의 중심 생각으로 가장 알맞은 것을 고르십시오.",
      "listening_script": "여자: 서장님, 인주경찰서가 작년에 이어...",
      "options": ["① 실제 상황을 가정한 반복 훈련이 중요하다.", ...],
      "correct_answer": 1
    },
    {
      "question_number": 26,
      "set_id": "set_2",
      "question_type_in_set": "detail",
      "question_text": "들은 내용과 같은 것을 고르십시오.",
      "listening_script": "여자: 서장님, 인주경찰서가 작년에 이어...",
      "options": ["① 이 경찰서가 있는 지역은 사건이 자주 발생한다.", ...],
      "correct_answer": 1
    }
  ]
}
\`\`\`

## ⚠️ 필수 준수 사항

1. **2문항 1세트**: 같은 set_id를 가진 문제는 반드시 2개씩
2. **스크립트 공유**: 같은 세트의 2문제는 **완전히 동일한 listening_script**
3. **질문 다양성**: 같은 세트 내에서 질문 유형이 달라야 함 (intent+detail 등)
4. **문제 수 맞추기**: 요청한 문제 수가 홀수면 짝수로 맞춰서 생성 (세트 단위)
5. **스크립트 길이**: 세트형 문제는 6~10턴 정도의 긴 대화 또는 담화
` : ''}

${params.listeningQuestionType === '5-8' ? `
⚠️ [1-3번 그림 문제] 필수 지침 - TOPIK II 실제 시험 형식 준수!

TOPIK II 듣기 영역에서 그림 문제는 **3문항**이 출제됩니다:

## 📌 문항별 유형 (매우 중요!)

### 문항 1-2: 장면/행동 그림 (picture_type: "scene")
- **형식**: 짧은 대화를 듣고 4개 그림 중 알맞은 것 선택
- **그림 스타일**: 만화/일러스트, 교육용 흑백 스타일
- **대화 특징**: 
  - 2인 대화 (남자-여자)
  - 2-3턴의 짧은 대화
  - 일상 상황 (과일 가게, 가구 만들기 등)
- **listening_script 예시**:
  \`\`\`
  여자: 손님, 수박 보고 가세요. 아주 맛있어요.
  남자: 여기 접시 위에 있는 거 한번 먹어 봐도 돼요?
  여자: 그럼요. 드셔 보세요.
  \`\`\`
- **option_image_descriptions 예시**:
  - ① "과일 가게에서 여자 판매원이 남자에게 수박 조각을 건네고, 남자가 맛보는 장면"
  - ② "남자가 수박을 들고 계산대로 가는 장면"
  - ③ "여자가 수박을 자르고 있고 남자가 지켜보는 장면"
  - ④ "남자가 수박을 비닐봉지에 담는 장면"

### 문항 3: 그래프/도표 그림 (picture_type: "graph")
- **형식**: 담화(뉴스, 보도)를 듣고 4개 그래프/도표 중 알맞은 것 선택
- **그림 스타일**: 선 그래프 + 원형(도넛) 차트 조합
- **담화 특징**:
  - 1인 담화 (뉴스 앵커, 리포터)
  - 통계 데이터 언급 (연도별 추이, 비율 등)
  - 공식적 어투
- **listening_script 예시**:
  \`\`\`
  남자: 채소, 달걀 등의 식품을 정기적으로 배달 받는 서비스가 인기를 끌며 최근 4년간 이용자가 꾸준히 증가하고 있습니다. 이 서비스를 이용하는 이유로는 '신선하고 품질이 좋아서'가 가장 많았으며, '가격이 합리적이어서', '편리해서'가 그 뒤를 이었습니다.
  \`\`\`
- **option_image_descriptions 예시** (4개 모두 다른 데이터 조합):
  - ① "선그래프: 2020년 3만명 → 2021년 6만명 → 2022년 9만명 → 2023년 12만명 (꾸준히 증가). 원차트: 신선/품질 43%, 편리 36%, 가격 21%"
  - ② "선그래프: 2020년 12만명 → 2021년 9만명 → 2022년 6만명 → 2023년 12만명 (V자 형태). 원차트: 동일"
  - ③ "선그래프: 꾸준히 증가. 원차트: 가격 43%, 품질 21%, 편리 36% (순서 다름)"
  - ④ "선그래프: 꾸준히 증가. 원차트: 품질 21%, 편리 36%, 가격 43% (비율 다름)"

## ⚠️ 필수 준수 사항

1. **question_number 1, 2**: picture_type="scene", 대화형 스크립트
2. **question_number 3**: picture_type="graph", 담화형 스크립트
3. **options 필드**: ["①", "②", "③", "④"]로 고정
4. **option_image_descriptions**: 정답 번호에 해당하는 설명만 스크립트와 완전히 일치
5. **오답 3개**: 비슷하지만 핵심 요소(행동/위치/수치/비율)가 다르게 설계
` : ''}
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
  const systemPrompt = buildSystemPrompt(params, ragContext);
  
  // 듣기 문제는 Claude 사용, 나머지는 Gemini 2.5 Pro
  const useClaude = params.section === 'listening';
  const modelName = useClaude ? 'claude-sonnet-4-5-20250929' : (Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send progress update
        const sendProgress = (step: string, progress: number, message: string) => {
          const data = JSON.stringify({ type: "progress", step, progress, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        sendProgress("rag", 20, "📚 RAG 검색 완료");
        
        const modelLabel = useClaude ? "Claude Sonnet 4 (듣기 전용)" : "Gemini 2.5 Pro";
        sendProgress("generating", 30, `🤖 ${modelLabel} 문제 생성 시작...`);

        let aiResponse: Response | null = null;
        let lastError = "";
        
        // 최대 10분 (600초) 타임아웃 - 듣기 문제 생성 시 TTS까지 포함
        const AI_TIMEOUT_MS = 600000; // 10 minutes
        
        const userPrompt = `${systemPrompt}\n\n---\n\n${params.questionCount}개의 ${params.section} 문제를 생성해주세요.
${params.topic ? `주제/문법: ${params.topic}` : ''}
난이도: ${params.difficulty}
모든 문제는 실제 TOPIK 시험과 동일한 형식이어야 합니다.

반드시 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.`;
        
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), AI_TIMEOUT_MS);
            
            sendProgress("generating", 30 + attempt * 2, `🤖 ${modelLabel} 호출 중... (시도 ${attempt + 1}/3, 최대 10분)`);
            
            if (useClaude) {
              // Claude API 호출 (듣기 문제용) - 스트리밍
              console.log(`🎧 Using Claude Sonnet 4 for listening questions`);
              aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': ANTHROPIC_API_KEY!,
                  'anthropic-version': '2023-06-01',
                  'Content-Type': 'application/json',
                },
                signal: abortController.signal,
                body: JSON.stringify({
                  model: 'claude-sonnet-4-5-20250929',
                  max_tokens: 16384,
                  stream: true,
                  system: 'You are a TOPIK exam question generator. Always respond in valid JSON format with a "questions" array. Output only JSON, no other text.',
                  messages: [
                    { role: 'user', content: userPrompt }
                  ],
                }),
              });
            } else {
              // Gemini API 호출 (읽기/쓰기 문제용)
              aiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  signal: abortController.signal,
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [{ text: userPrompt }]
                    }],
                    generationConfig: {
                      temperature: 0.7,
                      topP: 0.95,
                      topK: 40,
                      maxOutputTokens: 65536,
                      responseMimeType: "application/json",
                      thinkingConfig: {
                        thinkingBudget: 24576,
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
            }
            
            clearTimeout(timeoutId);

            if (aiResponse.ok) break;
            
            const errorText = await aiResponse.text();
            lastError = `API error: ${aiResponse.status}`;
            console.error(`${modelLabel} attempt ${attempt + 1} failed:`, aiResponse.status, errorText.slice(0, 200));
            
            // Retry on 503 (overloaded) or 429 (rate limit)
            if (aiResponse.status === 503 || aiResponse.status === 429) {
              sendProgress("generating", 32, `⏳ 재시도 중... (${attempt + 1}/3)`);
              await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); // Exponential backoff
            } else {
              break; // Don't retry other errors
            }
          } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
              lastError = `타임아웃 (10분 초과) - 문제 수를 줄여서 다시 시도해주세요.`;
              console.error(`${modelLabel} timeout after ${AI_TIMEOUT_MS}ms on attempt ${attempt + 1}`);
            } else {
              lastError = fetchError.message || "Network error";
              console.error(`${modelLabel} fetch error attempt ${attempt + 1}:`, lastError);
            }
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            }
          }
        }

        if (!aiResponse || !aiResponse.ok) {
          throw new Error(lastError || "AI API 호출 실패. 잠시 후 다시 시도해주세요.");
        }

        // Stream the response
        const reader = aiResponse.body?.getReader();
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
                
                // Claude와 Gemini의 응답 형식이 다름
                let text = '';
                if (useClaude) {
                  // Anthropic Claude 스트리밍 형식
                  if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                    text = parsed.delta.text || '';
                  }
                } else {
                  // Gemini 스트리밍 형식
                  text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }
                
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
            } else if (line.startsWith('event: ')) {
              // Claude SSE event 처리
              continue;
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
          console.error("Failed to parse AI response:", fullContent.slice(0, 500));
          throw new Error("Failed to parse AI response as JSON");
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

        // Generate 4 images for picture dialogue questions [5-8]
        // TOPIK II: 문항 1-2는 장면 그림(scene), 문항 3은 그래프(graph)
        if (params.section === 'listening' && params.listeningQuestionType === '5-8') {
          sendProgress("image", 89, "🖼️ 그림 문제 이미지 생성 중...");
          
          for (let i = 0; i < validQuestions.length; i++) {
            const q = validQuestions[i];
            if (q.option_image_descriptions && q.option_image_descriptions.length === 4) {
              const optionImages: string[] = [];
              const questionNum = q.question_number || i + 1;
              
              let pictureType: PictureQuestionType;
              if (q.picture_type === "graph" || q.picture_type === "scene") {
                pictureType = q.picture_type;
              } else {
                pictureType = (questionNum === 3) ? "graph" : "scene";
              }
              const typeLabel = pictureType === "graph" ? "📊 그래프" : "🎨 장면";
              
              console.log(`[Q${questionNum}] Picture type: ${pictureType}`);
              
              for (let j = 0; j < 4; j++) {
                const desc = q.option_image_descriptions[j];
                sendProgress("image", 89 + ((i * 4 + j) / (validQuestions.length * 4)) * 3, 
                  `${typeLabel} Q${questionNum} 보기 ${j + 1} 생성 중...`);
                
                const imageUrl = await generatePictureQuestionImage(
                  desc,
                  questionNum,
                  j + 1,
                  pictureType,
                  params.examType,
                  supabase
                );
                optionImages.push(imageUrl || '');
              }
              
              validQuestions[i].option_images = optionImages;
            }
          }
        }

        // Generate audio for listening questions
        if (params.section === 'listening' && params.generateAudio !== false && GEMINI_API_KEY) {
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
          model: modelName,
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
    if (params.section === 'listening' && params.generateAudio !== false && GEMINI_API_KEY) {
      const ttsPreset = params.ttsPreset || 'exam';
      
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        if (q.listening_script) {
          const audioUrl = await generateListeningAudio(
            q.listening_script,
            q.question_number || i + 1,
            params.examType,
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
