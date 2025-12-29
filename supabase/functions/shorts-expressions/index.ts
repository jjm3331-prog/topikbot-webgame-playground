import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Expression {
  korean: string;
  translation: string;
  context: string;
  timestamp: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, subtitles, targetLanguage = "vi" } = await req.json();

    if (!videoId || !subtitles || subtitles.length === 0) {
      return new Response(
        JSON.stringify({ error: "videoId and subtitles are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check cache first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const cacheKey = `shorts-expressions-${videoId}-${targetLanguage}`;
    
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .eq("function_name", "shorts-expressions")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached?.response) {
      console.log("Cache hit for", cacheKey);
      return new Response(
        JSON.stringify({ expressions: cached.response, source: "cache" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare subtitles for LLM
    const subtitleText = subtitles
      .map((s: { text: string; start: number }, idx: number) => 
        `[${idx}] ${Math.floor(s.start)}초: "${s.text}"`
      )
      .join("\n");

    const languageNames: Record<string, string> = {
      vi: "베트남어",
      en: "영어",
      ja: "일본어",
      zh: "중국어",
      ru: "러시아어",
      uz: "우즈베크어",
    };

    const targetLangName = languageNames[targetLanguage] || "영어";

    const systemPrompt = `당신은 한국어 교육 전문가입니다. 유튜브 쇼츠 영상의 자막에서 외국인 학습자에게 가장 유용한 핵심 표현 4개를 선별합니다.

선별 기준:
1. 일상 회화에서 자주 사용되는 표현
2. 한국 문화나 드라마에서 흔히 등장하는 표현
3. 문법적으로 배울 가치가 있는 표현
4. 감정이나 상황을 잘 전달하는 표현

출력 형식은 반드시 JSON 배열로:
[
  {
    "korean": "깔끔하게 정리된 한국어 표현",
    "translation": "${targetLangName}로 번역된 자연스러운 표현",
    "context": "이 표현이 어떤 상황에서 사용되는지 ${targetLangName}로 간단한 설명",
    "timestamp": 해당_자막의_시작_초_숫자
  }
]

중요:
- 자막 그대로가 아닌, 핵심 표현만 추출하여 깔끔하게 정리
- 불완전한 문장은 자연스럽게 완성
- 반드시 4개만 선별
- JSON만 출력, 다른 텍스트 없이`;

    const userPrompt = `다음 한국어 자막에서 핵심 표현 4개를 선별해주세요:\n\n${subtitleText}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let expressions: Expression[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        expressions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse expressions:", parseError, content);
      throw new Error("Failed to parse AI response");
    }

    // Cache the result for 7 days
    await supabase.from("ai_response_cache").upsert({
      cache_key: cacheKey,
      function_name: "shorts-expressions",
      response: expressions,
      request_params: { videoId, targetLanguage },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "cache_key" });

    return new Response(
      JSON.stringify({ expressions, source: "llm" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in shorts-expressions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
