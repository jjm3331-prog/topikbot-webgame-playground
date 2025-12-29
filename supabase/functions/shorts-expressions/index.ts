import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeySentence {
  korean: string;
  translation: string;
  explanation: string;
  timestamp: number;
}

interface Vocabulary {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleTranslation: string;
}

interface Idiom {
  korean: string;
  literal: string;
  meaning: string;
  usage: string;
}

interface CulturalNote {
  topic: string;
  explanation: string;
  tip: string;
}

interface LearningContent {
  keySentences: KeySentence[];
  vocabulary: Vocabulary[];
  idioms: Idiom[];
  culturalNotes: CulturalNote[];
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

    const cacheKey = `shorts-learning-v2-${videoId}-${targetLanguage}`;
    
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
        JSON.stringify({ ...cached.response, source: "cache" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare subtitles for LLM - clean up and combine
    const subtitleText = subtitles
      .map((s: { text: string; start: number }, idx: number) => 
        `[${Math.floor(s.start)}초] ${s.text}`
      )
      .join("\n");

    const languageNames: Record<string, string> = {
      vi: "Vietnamese",
      en: "English",
      ja: "Japanese",
      zh: "Chinese",
      ru: "Russian",
      uz: "Uzbek",
    };

    const targetLangName = languageNames[targetLanguage] || "English";

    const systemPrompt = `You are an expert Korean language educator. Analyze YouTube Shorts video subtitles and create comprehensive learning content for foreign learners.

Your task is to extract and create:

1. **Key Sentences (핵심 문장)**: 3-4 important, natural Korean sentences from the video
   - Clean up any fragmented or incomplete sentences
   - Make them grammatically correct and natural
   - Include timestamp where they appear

2. **Vocabulary (어휘)**: 4-6 useful words/phrases
   - Focus on commonly used words
   - Include part of speech
   - Provide example sentences

3. **Idioms/Expressions (관용어)**: 1-2 Korean expressions or slang
   - Explain literal vs actual meaning
   - When this expression is typically used

4. **Cultural Notes (문화적 맥락)**: 1-2 cultural insights
   - Explain any Korean cultural context in the video
   - Tips for understanding Korean culture

IMPORTANT:
- All translations and explanations must be in ${targetLangName}
- Clean up messy or incomplete subtitles - extract the MEANING
- Focus on practical, useful learning content
- Do NOT use romanization for Korean text

Output ONLY valid JSON in this exact format:
{
  "keySentences": [
    {
      "korean": "깔끔한 한국어 문장",
      "translation": "${targetLangName} translation",
      "explanation": "Grammar or usage explanation in ${targetLangName}",
      "timestamp": 5
    }
  ],
  "vocabulary": [
    {
      "word": "단어",
      "meaning": "meaning in ${targetLangName}",
      "partOfSpeech": "noun/verb/adjective/etc",
      "example": "예문",
      "exampleTranslation": "example translation"
    }
  ],
  "idioms": [
    {
      "korean": "관용 표현",
      "literal": "literal meaning in ${targetLangName}",
      "meaning": "actual meaning in ${targetLangName}",
      "usage": "when/how to use in ${targetLangName}"
    }
  ],
  "culturalNotes": [
    {
      "topic": "Topic name",
      "explanation": "Cultural explanation in ${targetLangName}",
      "tip": "Practical tip for learners in ${targetLangName}"
    }
  ]
}`;

    const userPrompt = `Analyze these Korean subtitles and create learning content:\n\n${subtitleText}`;

    console.log("Requesting learning content for video:", videoId, "language:", targetLanguage);

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
        max_tokens: 4096,
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
    let learningContent: LearningContent = {
      keySentences: [],
      vocabulary: [],
      idioms: [],
      culturalNotes: [],
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        learningContent = {
          keySentences: parsed.keySentences || [],
          vocabulary: parsed.vocabulary || [],
          idioms: parsed.idioms || [],
          culturalNotes: parsed.culturalNotes || [],
        };
      }
    } catch (parseError) {
      console.error("Failed to parse learning content:", parseError, content);
      throw new Error("Failed to parse AI response");
    }

    console.log("Generated learning content:", {
      sentences: learningContent.keySentences.length,
      vocab: learningContent.vocabulary.length,
      idioms: learningContent.idioms.length,
      cultural: learningContent.culturalNotes.length,
    });

    // Cache the result for 7 days
    await supabase.from("ai_response_cache").upsert({
      cache_key: cacheKey,
      function_name: "shorts-expressions",
      response: learningContent,
      request_params: { videoId, targetLanguage },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "cache_key" });

    return new Response(
      JSON.stringify({ ...learningContent, source: "llm" }),
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
