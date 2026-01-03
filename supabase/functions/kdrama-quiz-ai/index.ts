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
    const { drama, dramaEn, character, language = 'ko' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langInstructions: Record<string, string> = {
      ko: '한국어로 답변하세요.',
      vi: 'Trả lời bằng tiếng Việt.',
      en: 'Answer in English.',
      zh: '用中文回答。',
      ja: '日本語で答えてください。',
      ru: 'Ответьте на русском языке.',
      uz: "O'zbek tilida javob bering.",
    };

    const langInstruction = langInstructions[language] || langInstructions.en;

    const systemPrompt = `You are a K-Drama expert who creates fun trivia quizzes about Korean dramas.
${langInstruction}

You MUST respond with valid JSON only, no other text. The JSON must have this exact structure:
{
  "question": "A fun trivia question about the drama, actors, or Korean culture",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "funFact": "An interesting fact about the drama or actors"
}

Create diverse questions about:
- Main actors and their other works
- Drama plot and characters
- Behind-the-scenes facts
- Korean culture shown in the drama
- Awards and recognition
- Filming locations
- OST and music`;

    const userPrompt = `Create a fun quiz question about the K-Drama "${drama}" (${dramaEn}), featuring the character "${character}".
Make it entertaining and educational about Korean culture, the actors, or the drama itself.`;

    console.log(`[kdrama-quiz-ai] Generating quiz for drama: ${drama}, language: ${language}`);

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[kdrama-quiz-ai] API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[kdrama-quiz-ai] Raw response:", content);

    // Parse JSON from response
    let quiz;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[kdrama-quiz-ai] Parse error:", parseError);
      // Return a fallback quiz
      quiz = {
        question: language === 'ko' ? `"${drama}"에 대해 알고 계신가요?` : 
                  language === 'vi' ? `Bạn có biết về "${drama}" không?` :
                  `Do you know about "${drama}"?`,
        options: language === 'ko' 
          ? ["네, 잘 알아요", "조금 알아요", "처음 들어봐요", "더 알고 싶어요"]
          : language === 'vi'
          ? ["Có, tôi biết rõ", "Biết một chút", "Lần đầu nghe", "Muốn biết thêm"]
          : ["Yes, I know it well", "I know a little", "First time hearing", "Want to know more"],
        correctIndex: 0,
        funFact: language === 'ko' 
          ? `"${drama}"는 많은 사랑을 받은 한국 드라마입니다.`
          : language === 'vi'
          ? `"${drama}" là một bộ phim Hàn Quốc được yêu thích.`
          : `"${drama}" is a beloved Korean drama.`
      };
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[kdrama-quiz-ai] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
