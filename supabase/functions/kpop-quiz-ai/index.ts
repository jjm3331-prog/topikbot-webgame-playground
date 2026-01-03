import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, song, language = "ko" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[KPop Quiz AI] Generating quiz for ${artist} - ${song}, lang: ${language}`);

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

    const systemPrompt = `You are an expert K-Pop quiz master with encyclopedic knowledge of Korean pop music, artists, and entertainment industry. Your mission is to create ENGAGING, FUN, and CREATIVE trivia questions that K-Pop fans will love.

${langInstruction}

CRITICAL RULES:
1. Create ONE unique, interesting quiz question about the given K-Pop artist/group
2. Questions should be entertaining and make fans excited to answer
3. Include 4 answer options - 1 correct, 3 plausible but incorrect
4. Wrong options should be believable (real K-Pop facts, just not about this artist)
5. Add a fun fact that reveals interesting trivia after answering

CREATIVE QUESTION CATEGORIES (randomly pick one):
- 🎤 Debut & History: "In which year did ${artist} make their legendary debut?"
- 👥 Member Facts: Fun facts about individual members, positions, real names, birthdays
- 🏆 Awards & Records: Billboard achievements, music show wins, Daesangs
- 💿 Discography: Album names, title tracks, hidden gems, B-sides
- 🎬 Music Videos: MV concepts, filming locations, easter eggs, view counts
- 🌟 Fandom: Official fandom name, lightstick colors, fan chants
- 🤝 Collaborations: Featured artists, OSTs, special stages
- 📱 Social Media: Viral moments, famous quotes, variety show appearances
- 🎭 Concepts: Different era concepts, styling changes, image transformations
- 🌍 World Tours: Concert venues, special performances, fan interactions
- 🎵 Behind the Scenes: Song writing credits, production involvement, trainee period
- 💕 Fun Facts: Hobbies, nicknames, friendship with other idols

RESPONSE FORMAT (JSON only, no markdown, no code blocks):
{
  "question": "Your creative, engaging question here",
  "options": ["Correct Answer", "Wrong Option 1", "Wrong Option 2", "Wrong Option 3"],
  "correctIndex": 0,
  "funFact": "An amazing trivia fact that fans will love learning!"
}

IMPORTANT:
- Shuffle the correct answer position (don't always put it at index 0)
- Make questions feel fresh and unique each time
- Include emojis in the question to make it visually appealing
- Fun fact should be genuinely interesting, not generic`;

    const userPrompt = `Create an exciting K-Pop trivia question about: ${artist}${song ? ` (The song "${song}" can be included as context but create varied questions about the artist/group in general)` : ""}

Make it fun, engaging, and test real K-Pop knowledge! 🎵`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
      if (response.status === 429) {
        console.error("[KPop Quiz AI] Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("[KPop Quiz AI] Payment required");
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("[KPop Quiz AI] API error:", response.status, errText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("[KPop Quiz AI] Raw response:", content.substring(0, 200));

    // Parse JSON from response
    let quiz;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      // Try to extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quiz = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
      
      // Validate quiz structure
      if (!quiz.question || !Array.isArray(quiz.options) || quiz.options.length !== 4 || typeof quiz.correctIndex !== 'number') {
        throw new Error("Invalid quiz structure");
      }
    } catch (parseError) {
      console.error("[KPop Quiz AI] Parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse AI response");
    }

    console.log("[KPop Quiz AI] Generated quiz:", quiz.question);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[KPop Quiz AI] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
