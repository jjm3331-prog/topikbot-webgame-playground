import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'mixed', count = 10, language = 'ko' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langInstructions: Record<string, string> = {
      ko: '모든 텍스트를 한국어로 작성하세요.',
      vi: 'Viết tất cả văn bản bằng tiếng Việt (ngoại trừ expression phải giữ nguyên tiếng Hàn).',
      en: 'Write all text in English (except expression must stay in Korean).',
      zh: '用中文写所有文本（expression必须保持韩语）。',
      ja: 'すべてのテキストを日本語で書いてください（expressionは韓国語のまま）。',
      ru: 'Напишите весь текст на русском языке (expression должен оставаться на корейском).',
      uz: "Barcha matnni o'zbek tilida yozing (expression koreys tilida qolishi kerak).",
    };

    const categoryPrompt = category === 'idiom' 
      ? '한국어 관용어/속담만 출제하세요 (예: 눈이 높다, 발이 넓다, 귀가 얇다).'
      : category === 'slang'
      ? 'MZ세대 한국 신조어/슬랭만 출제하세요 (예: 갓생, 점메추, 킹받다, 어쩔티비, 중꺾마).'
      : '한국어 관용어와 MZ슬랭을 섞어서 출제하세요.';

    const systemPrompt = `You are a Korean language quiz generator specialized in Korean idioms and MZ generation slang.
${langInstructions[language] || langInstructions.en}

Generate exactly ${count} quiz questions about Korean expressions.
${categoryPrompt}

You MUST respond with valid JSON only. The JSON must have this exact structure:
{
  "questions": [
    {
      "expression": "한국어 표현 (항상 한국어로)",
      "meaning": "정확한 의미 설명",
      "example": "예문 (실제 사용 예시)",
      "options": ["정답", "오답1", "오답2", "오답3"],
      "correctIndex": 0,
      "category": "idiom" or "slang",
      "difficulty": "easy" or "medium" or "hard"
    }
  ]
}

Important rules:
- expression must ALWAYS be in Korean
- meaning, example, options should be in the target language
- Shuffle the correct answer position (correctIndex should vary 0-3)
- Make wrong options plausible but clearly wrong
- Include a mix of difficulties
- For slang: use recent MZ generation terms (2020s)
- For idioms: use common Korean proverbs and expressions`;

    console.log(`[idiom-slang-quiz] Generating ${count} ${category} questions in ${language}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${count} ${category === 'mixed' ? 'mixed idiom and slang' : category} quiz questions.` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[idiom-slang-quiz] API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[idiom-slang-quiz] Raw response length:", content.length);

    let quiz;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[idiom-slang-quiz] Parse error:", parseError);
      // Return fallback questions
      quiz = {
        questions: [
          {
            expression: "눈이 높다",
            meaning: language === 'ko' ? "기준이 까다롭다" : "To have high standards",
            example: language === 'ko' ? "그녀는 눈이 높아서 아무나 안 만나요." : "She has high standards so she doesn't date just anyone.",
            options: language === 'ko' 
              ? ["기준이 까다롭다", "시력이 좋다", "키가 크다", "자만하다"]
              : ["To have high standards", "To have good eyesight", "To be tall", "To be arrogant"],
            correctIndex: 0,
            category: "idiom",
            difficulty: "easy"
          },
          {
            expression: "갓생",
            meaning: language === 'ko' ? "갓(God) + 인생, 부지런하고 계획적인 삶" : "God + Life, living a diligent and planned life",
            example: language === 'ko' ? "요즘 갓생 살려고 새벽 5시에 일어나요." : "I wake up at 5am these days trying to live my best life.",
            options: language === 'ko'
              ? ["부지런한 삶", "게으른 삶", "신앙생활", "파티생활"]
              : ["Diligent life", "Lazy life", "Religious life", "Party life"],
            correctIndex: 0,
            category: "slang",
            difficulty: "easy"
          }
        ]
      };
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[idiom-slang-quiz] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
