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
    const { previousWord, newWord, mode } = await req.json();

    if (!previousWord || !newWord) {
      return new Response(
        JSON.stringify({ error: "Missing words", isValid: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Validating chain: ${previousWord} → ${newWord} (mode: ${mode})`);

    // For phonetic mode, validate locally
    if (mode === "phonetic") {
      const lastChar = previousWord.charAt(previousWord.length - 1);
      const firstChar = newWord.charAt(0);
      
      // 두음법칙 처리
      const dueum: Record<string, string[]> = {
        "녀": ["여"], "뇨": ["요"], "뉴": ["유"], "니": ["이"],
        "랴": ["야"], "려": ["여"], "례": ["예"], "료": ["요"], 
        "류": ["유"], "리": ["이"], "라": ["나"], "래": ["내"],
        "로": ["노"], "뢰": ["뇌"], "루": ["누"], "르": ["느"],
      };
      
      const validStarts = [lastChar, ...(dueum[lastChar] || [])];
      const isValid = validStarts.includes(firstChar);
      
      return new Response(
        JSON.stringify({ isValid, mode: "phonetic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For semantic mode, use AI to validate
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Fallback: allow the connection but log warning
      return new Response(
        JSON.stringify({ isValid: true, mode: "semantic", fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a Korean word association validator. Your task is to determine if two Korean words have a meaningful semantic connection.

A valid semantic connection includes:
- Direct synonyms or antonyms
- Category relationships (학교-학생, 병원-의사)
- Cause-effect relationships (비-우산, 불-연기)
- Part-whole relationships (손-손가락, 나무-잎)
- Associated concepts (바다-물고기, 음악-악기)
- Common collocations (행복-미소, 성공-노력)

Respond with ONLY "true" or "false".`;

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
          { role: "user", content: `이전 단어: "${previousWord}"\n새 단어: "${newWord}"\n\n이 두 단어가 의미적으로 연결되어 있나요?` }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Fallback: allow the connection
      return new Response(
        JSON.stringify({ isValid: true, mode: "semantic", fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.toLowerCase().trim() || "";
    
    console.log(`AI response for ${previousWord} → ${newWord}: ${aiResponse}`);
    
    const isValid = aiResponse.includes("true");

    return new Response(
      JSON.stringify({ isValid, mode: "semantic" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chain-validate:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, isValid: true, fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
