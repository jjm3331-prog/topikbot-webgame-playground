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
    const { drama, dramaEn, context, language = 'ko' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[KDrama Quiz AI] Generating quiz for: ${drama} (${dramaEn}), lang: ${language}`);

    const languageInstructions: Record<string, string> = {
      ko: "모든 답변을 한국어로 작성하세요.",
      en: "Write all responses in English.",
      vi: "Viết tất cả các câu trả lời bằng tiếng Việt.",
      ja: "すべての回答を日本語で書いてください。",
      zh: "用中文写所有回答。",
      ru: "Напишите все ответы на русском языке.",
      uz: "Barcha javoblarni o'zbek tilida yozing."
    };

    const langInstruction = languageInstructions[language] || languageInstructions.ko;

    const systemPrompt = `You are an expert K-Drama quiz master with extensive knowledge of Korean dramas, actors, directors, and the Korean entertainment industry. Create ENGAGING and FUN trivia questions that K-Drama fans will enjoy!

${langInstruction}

CRITICAL RULES:
1. Create ONE unique, interesting quiz question about the given K-Drama
2. Questions should be entertaining and educational about Korean culture
3. Include 4 answer options - 1 correct, 3 plausible but incorrect
4. Wrong options should be believable (real K-Drama facts, just not about this drama)
5. Add a fun fact that reveals interesting trivia after answering

CREATIVE QUESTION CATEGORIES (randomly pick one):
- 🎬 Cast & Actors: Main leads, supporting actors, cameo appearances, their other works
- 📺 Plot & Story: Key plot points, memorable scenes, character relationships
- 🏆 Awards & Recognition: Baeksang, Drama Awards, international recognition
- 🎵 OST: Original soundtrack songs, artists who sang them, famous BGM
- 📍 Filming Locations: Real locations in Korea where scenes were filmed
- 👗 Fashion & Style: Iconic outfits, accessories that became trends
- 💕 Romance: Famous couple names, romantic scenes, love triangles
- 🌟 Behind the Scenes: Production facts, director's choices, ad-lib scenes
- 📊 Records: Ratings, streaming records, episode counts
- 🎭 Genre & Theme: Drama themes, social messages, cultural elements
- 🤝 Real Relationships: Actors who became real couples, best friend actors
- 📱 Viral Moments: Memes, quotes, scenes that went viral

RESPONSE FORMAT (JSON only, absolutely no markdown or code blocks):
{
  "question": "Your creative, engaging question about the K-Drama",
  "options": ["Correct Answer", "Wrong Option 1", "Wrong Option 2", "Wrong Option 3"],
  "correctIndex": 0,
  "funFact": "An amazing trivia fact about the drama that fans will love!"
}

IMPORTANT:
- Randomly position the correct answer (not always index 0)
- Make questions feel fresh and unique
- Include emojis to make questions visually appealing
- Fun facts should be genuinely interesting, not generic statements`;

    const userPrompt = `Create an exciting K-Drama trivia question about: "${drama}" (English title: ${dramaEn || drama})
${context ? `Additional context: ${context}` : ''}

Make it fun and test real K-Drama fan knowledge! 🎬`;

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
      console.error("[KDrama Quiz AI] API error:", response.status, errorText);
      
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

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[KDrama Quiz AI] Raw response:", content.substring(0, 200));

    // Parse JSON from response
    let quiz;
    try {
      // Remove any markdown formatting
      let jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      // Extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON object found in response");
      }
      
      // Validate quiz structure
      if (!quiz.question || !Array.isArray(quiz.options) || quiz.options.length !== 4 || typeof quiz.correctIndex !== 'number') {
        throw new Error("Invalid quiz structure");
      }
    } catch (parseError) {
      console.error("[KDrama Quiz AI] Parse error:", parseError);
      console.error("[KDrama Quiz AI] Content was:", content);
      throw new Error("Failed to parse AI response");
    }

    console.log("[KDrama Quiz AI] Generated quiz:", quiz.question);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[KDrama Quiz AI] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
