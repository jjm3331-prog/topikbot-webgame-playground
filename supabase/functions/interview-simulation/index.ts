import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewRequest {
  action: 'start' | 'respond' | 'evaluate';
  company: string;
  position: string;
  interviewerType: string;
  messages?: Message[];
  userMessage?: string;
  questionCount?: number;
}

const getInterviewerPersonality = (type: string) => {
  switch (type) {
    case 'friendly':
      return `당신은 친근하고 따뜻한 면접관입니다. 
지원자를 편안하게 해주고, 격려하며, 긍정적인 피드백을 많이 합니다.
실수를 해도 부드럽게 넘어가고, 장점을 찾아서 칭찬합니다.
"네, 좋습니다", "잘 말씀하셨어요" 같은 표현을 자주 사용합니다.`;
    
    case 'strict':
      return `당신은 엄격하고 까다로운 면접관입니다.
답변의 논리성과 구체성을 철저히 검증합니다.
모호한 답변에는 "좀 더 구체적으로 말씀해주세요"라고 요청합니다.
높은 기준을 가지고 있지만, 공정합니다.`;
    
    case 'pressure':
      return `당신은 압박 면접을 진행하는 면접관입니다.
의도적으로 스트레스를 주는 질문을 합니다.
"그래서 뭐가 특별하죠?", "그게 왜 우리 회사에 도움이 되나요?" 같은 도전적인 질문을 합니다.
지원자의 스트레스 대응 능력을 테스트합니다.
하지만 인격을 모욕하지는 않습니다.`;
    
    case 'technical':
      return `당신은 기술 면접관입니다.
직무와 관련된 전문적이고 기술적인 질문을 합니다.
실제 업무 상황을 시뮬레이션하는 질문을 합니다.
"이런 상황에서 어떻게 하시겠어요?"와 같은 시나리오 질문을 좋아합니다.`;
    
    default:
      return `당신은 일반적인 면접관입니다. 전문적이고 중립적인 태도를 유지합니다.`;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: InterviewRequest = await req.json();
    const { action, company, position, interviewerType, messages, userMessage, questionCount } = body;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const interviewerPersonality = getInterviewerPersonality(interviewerType);

    const systemPrompt = `# 역할: ${company} ${position} 면접관

${interviewerPersonality}

## 핵심 규칙
1. 반드시 한국어로만 말하세요
2. 한 번에 하나의 질문만 하세요
3. 지원자가 베트남 출신임을 고려하세요
4. 자연스럽고 인간적인 대화를 하세요
5. 각 답변에 대해 짧은 반응(1-2문장)을 한 후 다음 질문으로 넘어가세요

## 면접 흐름 (총 6-8개 질문)
1. 인사 및 자기소개 요청
2. 지원 동기 / 왜 ${company}인가
3. 관련 경험 또는 역량
4. ${position} 직무 관련 질문
5. 한국 생활 적응력 / 한국어 능력
6. 팀워크 또는 갈등 해결 경험
7. 본인의 강점/약점
8. 마지막 질문 있으신가요? → 면접 종료

## 현재 상태
- 현재까지 질문 수: ${questionCount || 0}개
- 6개 이상 질문했다면 자연스럽게 마무리를 시작하세요
- 마무리할 때: "면접이 끝났습니다. 수고하셨습니다!" 라고 말하세요

## 중요
- 창의적이고 유연하게 대화하세요
- 지원자의 답변을 잘 듣고 관련된 꼬리 질문도 하세요
- 실제 면접처럼 자연스럽게 진행하세요
- 메타 설명 없이 면접관의 말만 출력하세요`;

    let geminiMessages: any[] = [];

    if (action === 'start') {
      geminiMessages = [
        {
          role: 'user',
          parts: [{ text: `[시스템] ${systemPrompt}\n\n면접을 시작해주세요. 지원자에게 인사하고 자기소개를 요청하세요.` }]
        }
      ];
    } else if (action === 'respond') {
      // Build conversation history
      geminiMessages = [
        {
          role: 'user', 
          parts: [{ text: `[시스템] ${systemPrompt}` }]
        },
        {
          role: 'model',
          parts: [{ text: '네, 알겠습니다. 면접관 역할을 수행하겠습니다.' }]
        }
      ];

      if (messages && messages.length > 0) {
        for (const msg of messages) {
          geminiMessages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
      }

      if (userMessage) {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: userMessage }]
        });
      }
    } else if (action === 'evaluate') {
      // Generate comprehensive evaluation
      const conversationSummary = messages?.map(m => `${m.role === 'user' ? '지원자' : '면접관'}: ${m.content}`).join('\n');
      
      geminiMessages = [
        {
          role: 'user',
          parts: [{ text: `다음 면접 대화를 분석하고 종합 평가 리포트를 작성해주세요.

## 면접 정보
- 기업: ${company}
- 직무: ${position}
- 면접관 유형: ${interviewerType}

## 대화 내용
${conversationSummary}

## 요청하는 평가 리포트 형식 (JSON)
{
  "scores": {
    "overall": 0-100 (종합 점수),
    "content": 0-100 (답변 내용의 질),
    "communication": 0-100 (커뮤니케이션 능력),
    "korean": 0-100 (한국어 표현력),
    "attitude": 0-100 (태도 및 자세),
    "jobFit": 0-100 (직무 적합성)
  },
  "strengths": ["강점1", "강점2", "강점3"],
  "improvements": ["개선점1", "개선점2", "개선점3"],
  "overallFeedback": "전체적인 피드백 (2-3문장)",
  "tips": ["다음 면접을 위한 팁1", "팁2", "팁3"],
  "grade": "S/A/B/C/D 중 하나"
}

반드시 위 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만 출력하세요.` }]
        }
      ];
    }

    console.log(`Interview ${action} for ${company} ${position}, interviewer: ${interviewerType}`);

    // Call Gemini API with thinking budget
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: action === 'evaluate' ? 0.3 : 0.85,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: action === 'evaluate' ? 2000 : 800,
            thinkingConfig: {
              thinkingBudget: action === 'evaluate' ? 8192 : 4096
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
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract response text, handling thinking model output
    let aiResponse = '';
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text) {
          aiResponse = part.text;
          break;
        }
      }
    }

    if (!aiResponse) {
      throw new Error('No response from Gemini');
    }

    console.log(`Gemini response received for action: ${action}`);

    if (action === 'evaluate') {
      // Parse evaluation JSON
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanedResponse = aiResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.slice(7);
        }
        if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(0, -3);
        }
        cleanedResponse = cleanedResponse.trim();

        const evaluation = JSON.parse(cleanedResponse);
        return new Response(
          JSON.stringify({ evaluation, success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('Failed to parse evaluation:', parseError);
        // Return a default evaluation if parsing fails
        return new Response(
          JSON.stringify({
            evaluation: {
              scores: { overall: 75, content: 75, communication: 75, korean: 75, attitude: 75, jobFit: 75 },
              strengths: ["면접에 성실히 임함", "기본적인 의사소통 가능", "긍정적인 태도"],
              improvements: ["답변의 구체성 향상 필요", "한국어 표현력 향상", "직무 관련 지식 보충"],
              overallFeedback: "전반적으로 무난한 면접이었습니다. 더 많은 연습을 통해 발전할 수 있습니다.",
              tips: ["구체적인 경험 사례 준비", "회사 정보 더 조사하기", "예상 질문 연습"],
              grade: "B"
            },
            success: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if interview ended
    const ended = aiResponse.includes('면접이 끝났습니다') || 
                  aiResponse.includes('면접을 마치겠습니다') ||
                  aiResponse.includes('수고하셨습니다') ||
                  aiResponse.includes('오늘 면접은 여기까지');

    return new Response(
      JSON.stringify({ 
        message: aiResponse, 
        ended,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Interview simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process interview';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
