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

    const languageMap: Record<string, string> = {
      ko: "한국어",
      en: "English",
      vi: "Tiếng Việt",
      ja: "日本語",
      zh: "中文",
      ru: "Русский",
      uz: "O'zbekcha"
    };

    const langName = languageMap[language] || "한국어";

    const systemPrompt = `You are a K-Pop trivia expert. Generate fun and interesting multiple-choice quiz questions about K-Pop artists.
    
RULES:
- Create 1 engaging quiz question about the given artist/group
- Question types: debut year, member names, album names, awards, fun facts, collaborations, fandom name, etc.
- Provide 4 answer options (A, B, C, D)
- One correct answer, three plausible wrong answers
- Make it fun and educational for K-Pop fans
- Respond in ${langName}

OUTPUT FORMAT (JSON only, no markdown):
{
  "question": "quiz question text",
  "options": ["A option", "B option", "C option", "D option"],
  "correctIndex": 0,
  "funFact": "interesting fact about the answer"
}`;

    const userPrompt = `Generate a fun K-Pop trivia question about: ${artist}${song ? ` (related to the song "${song}")` : ""}`;

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
      const errText = await response.text();
      console.error("[KPop Quiz AI] API error:", response.status, errText);
      throw new Error("AI API error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let quiz;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      quiz = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[KPop Quiz AI] Parse error:", parseError, "Content:", content);
      // Fallback quiz
      quiz = {
        question: language === "ko" 
          ? `${artist}에 대해 알고 계신가요?`
          : `Do you know about ${artist}?`,
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        funFact: ""
      };
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
