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
    const { word, pos, sentence, correctParts, count = 2 } = await req.json();
    
    if (!word || !sentence || !correctParts) {
      throw new Error("word, sentence, correctParts are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a Korean language expert creating distractor fragments for a sentence ordering exercise.

Your task: Generate ${count} DISTRACTOR fragments that:
1. Look grammatically plausible but DON'T belong in the target sentence
2. Match the grammatical style/register of the sentence
3. Could confuse learners who don't understand the context
4. Are similar in length to the correct fragments

RULES:
- Each distractor should be 1-3 words
- Distractors must NOT be part of the correct sentence
- Use grammar particles, connectors, or phrases that fit Korean sentence patterns
- Consider the word's part of speech (${pos || 'unknown'}) when creating distractors

Respond ONLY with a JSON array of strings, no explanation.
Example: ["그리고 나서", "때문에"]`;

    const userPrompt = `Target word: ${word}
Part of speech: ${pos || 'N/A'}
Full sentence: ${sentence}
Correct fragments: ${JSON.stringify(correctParts)}

Generate ${count} distractor fragments that don't belong in this sentence but look plausible.`;

    console.log("Generating distractors for:", word);

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
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Fallback to static distractors
      const fallbackDistractors = getFallbackDistractors(pos, count);
      return new Response(JSON.stringify({ distractors: fallbackDistractors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response
    let distractors: string[] = [];
    try {
      // Handle markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        distractors = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse distractors:", parseError);
      distractors = getFallbackDistractors(pos, count);
    }

    // Filter out any that accidentally match correct parts
    const filteredDistractors = distractors.filter(
      (d: string) => !correctParts.some((p: string) => 
        p.includes(d) || d.includes(p)
      )
    );

    console.log("Generated distractors:", filteredDistractors);

    return new Response(JSON.stringify({ 
      distractors: filteredDistractors.slice(0, count) 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating distractors:", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      distractors: getFallbackDistractors(null, 2)
    }), {
      status: 200, // Still return 200 with fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fallback distractors based on part of speech
function getFallbackDistractors(pos: string | null, count: number): string[] {
  const patterns: Record<string, string[]> = {
    '동사': ["그리고 나서", "하지만", "라고", "게다가", "때문에"],
    '명사': ["것처럼", "으로서", "에게서", "부터는", "동안에"],
    '형용사': ["더욱", "매우", "아주", "상당히", "꽤나"],
    '부사': ["또한", "게다가", "심지어", "오히려", "결국"],
    default: ["그리고", "하지만", "그래서", "또한", "게다가", "때문에", "것처럼", "만큼"]
  };

  const pool = patterns[pos || ''] || patterns.default;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
