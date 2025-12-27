import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// 15가지 대표 시나리오 (한국어 프롬프트)
const SCENARIO_PROMPTS: Record<string, string> = {
  cafe: "카페에서 커피를 주문하는 상황",
  subway: "지하철역에서 길을 묻거나 표를 사는 상황",
  shopping: "백화점이나 시장에서 쇼핑하는 상황",
  direction: "길을 물어보거나 안내하는 상황",
  phone: "전화로 예약하거나 문의하는 상황",
  movie: "영화관에서 티켓을 사거나 상영 정보를 묻는 상황",
  hotel: "호텔 체크인/체크아웃하는 상황",
  restaurant: "식당에서 음식을 주문하는 상황",
  bank: "은행에서 업무를 보는 상황",
  dating: "소개팅이나 첫 만남에서 대화하는 상황",
  interview: "취업 면접을 보는 상황",
  airport: "공항에서 체크인하거나 안내를 받는 상황",
  hospital: "병원에서 진료를 받거나 약을 처방받는 상황",
  school: "학교에서 수업이나 교수님과 대화하는 상황",
  meeting: "회의에서 의견을 나누거나 발표하는 상황",
  custom: "", // 사용자 커스텀
};

const DIFFICULTY_GUIDELINES: Record<string, string> = {
  easy: "매우 쉬운 기초 표현만 사용. 짧은 문장(5-10단어). 기본 인사, 숫자, 간단한 요청만.",
  medium: "일상 표현 사용. 중간 길이 문장(10-15단어). 일반적인 대화 상황.",
  hard: "복잡한 표현과 관용어 사용. 긴 문장(15-20단어). 공식적/비공식적 표현 혼용.",
};

const LEVEL_GUIDELINES: Record<string, string> = {
  topik1: "TOPIK I (1-2급) 수준. 기초 문법만 사용. -아/어요, -ㅂ니다, -고 싶다 등 기본 표현.",
  topik2: "TOPIK II (3-6급) 수준. 중고급 문법 사용. -ㄹ 수 있다, -기 때문에, -는 것 같다 등 복잡한 표현.",
};

const buildSystemPrompt = (level: string, difficulty: string, userLang: string = "vi") => {
  const langName = userLang === "vi" ? "베트남어" : 
                   userLang === "en" ? "영어" :
                   userLang === "ja" ? "일본어" :
                   userLang === "zh" ? "중국어" :
                   userLang === "ru" ? "러시아어" :
                   userLang === "uz" ? "우즈베크어" : "베트남어";

  return `당신은 전문 한국어 회화 교사입니다. 학생들이 실전 상황에서 한국어를 연습할 수 있도록 돕습니다.

**레벨 설정:**
${LEVEL_GUIDELINES[level] || LEVEL_GUIDELINES.topik1}

**난이도 설정:**
${DIFFICULTY_GUIDELINES[difficulty] || DIFFICULTY_GUIDELINES.medium}

**역할:**
- 주어진 상황에 맞는 자연스러운 한국어 대화 진행
- 학생의 응답에 대한 즉시 피드백 제공 (문법, 표현, 발음)
- 격려하면서도 정확한 교정

**응답 규칙:**
1. 모든 응답은 한국어로 먼저, ${langName}로 번역 제공
2. 문장은 레벨/난이도에 맞게 조절
3. 자연스럽고 실용적인 표현 사용
4. 학생이 틀리면 올바른 표현과 설명 제공

**JSON 출력 형식 (필수):**
{
  "korean_response": "한국어 응답 (레벨에 맞게)",
  "vietnamese_meaning": "${langName} 번역",
  "pronunciation": "발음 표기 (로마자)",
  "feedback": {
    "is_correct": true/false,
    "correction": "올바른 표현 (틀렸을 경우)",
    "explanation": "왜 틀렸는지 ${langName}로 설명"
  },
  "scenario_context": "현재 상황 설명",
  "suggested_responses": ["추천 응답 1", "추천 응답 2"],
  "grammar_highlight": {
    "pattern": "핵심 문법 패턴",
    "level": "TOPIK 1/2",
    "usage": "사용법 설명"
  }
}

중요: JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`;
};

const buildQuizSystemPrompt = (level: string) => {
  return `당신은 TOPIK 문법 전문가입니다. 주어진 대화 내용을 바탕으로 퀴즈를 생성합니다.

**레벨:** ${level === "topik1" ? "TOPIK I (1-2급)" : "TOPIK II (3-6급)"}

**퀴즈 생성 규칙:**
- 대화에서 사용된 문법/어휘 기반 문제 생성
- 각 문제는 4지선다 (A, B, C, D)
- 레벨에 맞는 난이도
- 실용적이고 학습에 도움되는 문제

**JSON 출력 형식:**
{
  "quiz_title": "퀴즈 제목",
  "based_on_conversation": "대화 요약",
  "questions": [
    {
      "id": 1,
      "question": "문제",
      "korean_context": "관련 한국어 문장",
      "options": {"A": "선택지A", "B": "선택지B", "C": "선택지C", "D": "선택지D"},
      "correct_answer": "A",
      "explanation": "해설",
      "grammar_point": "문법 포인트",
      "topik_level": "TOPIK 1"
    }
  ]
}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      messages, 
      conversationHistory, 
      level = "topik1", 
      difficulty = "medium",
      scenarioId,
      customScenario,
      userLang = "vi"
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "start_roleplay") {
      // 시나리오 결정
      let scenarioText = "";
      if (customScenario && customScenario.trim()) {
        scenarioText = customScenario.trim();
      } else if (scenarioId && SCENARIO_PROMPTS[scenarioId]) {
        scenarioText = SCENARIO_PROMPTS[scenarioId];
      } else {
        // 랜덤 시나리오
        const keys = Object.keys(SCENARIO_PROMPTS).filter(k => k !== "custom");
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        scenarioText = SCENARIO_PROMPTS[randomKey];
      }

      systemPrompt = buildSystemPrompt(level, difficulty, userLang);
      userPrompt = `새로운 롤플레이를 시작합니다.

**상황:** ${scenarioText}
**레벨:** ${level === "topik1" ? "TOPIK I (초급)" : "TOPIK II (중고급)"}
**난이도:** ${difficulty === "easy" ? "쉬움" : difficulty === "medium" ? "보통" : "어려움"}

이 상황에 맞는 첫 번째 대화를 시작하세요. 당신이 상황에 맞는 역할(점원, 안내원, 상대방 등)이 되어 학생에게 먼저 말을 걸어주세요.

JSON 형식으로만 응답하세요.`;

    } else if (action === "continue_roleplay") {
      const lastUserMessage = messages?.[messages.length - 1]?.content || "";
      
      systemPrompt = buildSystemPrompt(level, difficulty, userLang);
      userPrompt = `학생의 응답: "${lastUserMessage}"

대화 기록:
${conversationHistory?.map((m: Message) => `${m.role === "assistant" ? "선생님" : "학생"}: ${m.content}`).join("\n") || "없음"}

학생의 응답을 평가하고 대화를 이어가세요:
1. 문법/표현이 맞는지 확인
2. 틀렸다면 교정 및 설명
3. 자연스럽게 대화 이어가기
4. 2개의 추천 응답 제시

JSON 형식으로만 응답하세요.`;

    } else if (action === "generate_quiz") {
      systemPrompt = buildQuizSystemPrompt(level);
      userPrompt = `다음 대화 내용을 바탕으로 ${level === "topik1" ? "3" : "5"}개의 퀴즈 문제를 생성하세요:

${conversationHistory?.map((m: Message) => `${m.role === "assistant" ? "선생님" : "학생"}: ${m.content}`).join("\n") || "대화 없음"}

대화에서 사용된 문법과 어휘를 바탕으로 문제를 만드세요.
JSON 형식으로만 응답하세요.`;

    } else {
      throw new Error("Invalid action. Use: start_roleplay, continue_roleplay, or generate_quiz");
    }

    console.log(`Action: ${action}, Level: ${level}, Difficulty: ${difficulty}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
          }
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "API 요청 한도 초과. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw AI response length:", aiResponse.length);

    // Clean and parse JSON
    aiResponse = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let jsonStart = aiResponse.indexOf("{");
    let jsonEnd = -1;
    let braceCount = 0;
    
    for (let i = jsonStart; i < aiResponse.length; i++) {
      if (aiResponse[i] === "{") braceCount++;
      if (aiResponse[i] === "}") braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No valid JSON found in response");
      return new Response(
        JSON.stringify({ error: "Invalid response format", raw: aiResponse.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jsonString = aiResponse.substring(jsonStart, jsonEnd);
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      const fixedJson = jsonString
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      
      try {
        result = JSON.parse(fixedJson);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`${action} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, action, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in roleplay-speak:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
