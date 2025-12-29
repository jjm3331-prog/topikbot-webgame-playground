import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExamData {
  examType: string;
  totalQuestions: number;
  correctCount: number;
  listeningCorrect: number;
  listeningTotal: number;
  readingCorrect: number;
  readingTotal: number;
  writingCount?: number;
  writingTotal?: number;
  timeTaken: number;
  wrongQuestions: Array<{
    section: string;
    partNumber: number;
    questionText: string;
    userAnswer: number;
    correctAnswer: number;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { examData, language = 'ko' } = await req.json() as { examData: ExamData; language?: string };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const listeningRate = examData.listeningTotal > 0 
      ? Math.round((examData.listeningCorrect / examData.listeningTotal) * 100) 
      : 0;
    const readingRate = examData.readingTotal > 0 
      ? Math.round((examData.readingCorrect / examData.readingTotal) * 100) 
      : 0;
    const totalRate = Math.round((examData.correctCount / examData.totalQuestions) * 100);

    // Calculate predicted grade
    let predictedGrade = 1;
    if (examData.examType === 'TOPIK_I') {
      if (totalRate >= 80) predictedGrade = 2;
      else predictedGrade = 1;
    } else if (examData.examType === 'TOPIK_II') {
      if (totalRate >= 90) predictedGrade = 6;
      else if (totalRate >= 75) predictedGrade = 5;
      else if (totalRate >= 60) predictedGrade = 4;
      else predictedGrade = 3;
    }

    const wrongBySection = examData.wrongQuestions.reduce((acc, q) => {
      const key = `${q.section}_part${q.partNumber}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const systemPrompt = language === 'ko' 
      ? `당신은 TOPIK 시험 전문 분석가입니다. 학생의 모의고사 결과를 분석하고 구체적인 학습 조언을 제공하세요.
응답은 반드시 JSON 형식으로 해주세요.`
      : `You are a TOPIK exam analysis expert. Analyze the student's mock test results and provide specific study advice.
Response must be in JSON format.`;

    const userPrompt = `
시험 결과 분석 요청:
- 시험 유형: ${examData.examType}
- 총 점수: ${totalRate}% (${examData.correctCount}/${examData.totalQuestions})
- 듣기: ${listeningRate}% (${examData.listeningCorrect}/${examData.listeningTotal})
- 읽기: ${readingRate}% (${examData.readingCorrect}/${examData.readingTotal})
${examData.writingTotal ? `- 쓰기: ${examData.writingCount}/${examData.writingTotal} 작성` : ''}
- 소요 시간: ${Math.floor(examData.timeTaken / 60)}분 ${examData.timeTaken % 60}초
- 오답 분포: ${JSON.stringify(wrongBySection)}
- 예상 등급: ${predictedGrade}급

다음 JSON 형식으로 분석해주세요:
{
  "overallAnalysis": "전체적인 분석 (2-3문장)",
  "strengths": ["강점 1", "강점 2"],
  "weaknesses": ["약점 1", "약점 2", "약점 3"],
  "listeningAnalysis": "듣기 영역 분석 (2-3문장)",
  "readingAnalysis": "읽기 영역 분석 (2-3문장)",
  "writingAnalysis": "쓰기 영역 분석 (해당시)",
  "recommendations": [
    {"priority": "high", "category": "문법", "advice": "구체적 조언"},
    {"priority": "medium", "category": "어휘", "advice": "구체적 조언"},
    {"priority": "low", "category": "연습", "advice": "구체적 조언"}
  ],
  "studyPlan": {
    "daily": "매일 해야 할 것",
    "weekly": "주간 목표",
    "focusAreas": ["집중 영역 1", "집중 영역 2"]
  },
  "motivationalMessage": "격려 메시지"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      analysis = {
        overallAnalysis: content,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        studyPlan: {},
        motivationalMessage: ""
      };
    }

    return new Response(JSON.stringify({
      success: true,
      predictedGrade,
      scores: {
        total: totalRate,
        listening: listeningRate,
        reading: readingRate,
      },
      analysis
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Report generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
