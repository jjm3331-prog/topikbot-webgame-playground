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

    // For phonetic mode, validate chain connection AND word existence
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
      const isChainValid = validStarts.includes(firstChar);
      
      if (!isChainValid) {
        console.log(`Chain invalid: ${lastChar} → ${firstChar}`);
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            mode: "phonetic", 
            reason: `'${lastChar}'(으)로 시작해야 합니다` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Now validate if the word actually exists using AI
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (!LOVABLE_API_KEY) {
        console.error("LOVABLE_API_KEY not configured - skipping word validation");
        return new Response(
          JSON.stringify({ isValid: true, mode: "phonetic", fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate word existence with AI
      const wordValidationPrompt = `당신은 한국어 사전 검증 전문가입니다. 주어진 단어가 실제로 존재하는 한국어 단어인지 판별하세요.

판별 기준:
1. 표준국어대사전에 등재된 단어여야 함
2. 일반 명사, 고유명사(나라, 도시, 유명인물 등), 동사, 형용사 등 모든 품사 허용
3. 외래어도 일반적으로 사용되는 경우 허용 (예: 컴퓨터, 텔레비전)
4. 비속어, 욕설은 불허용
5. 의미 없는 음절 조합은 불허용 (예: 랄프, 즈랄, 콘치즈)
6. 최소 2글자 이상이어야 함

응답 형식:
- 유효한 단어면: "VALID"
- 유효하지 않으면: "INVALID:이유"`;

      console.log(`Validating word existence: ${newWord}`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: wordValidationPrompt },
            { role: "user", content: `단어: "${newWord}"\n\n이 단어가 실제로 존재하는 한국어 단어인가요?` }
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        // Fallback: allow the word (better UX than blocking)
        return new Response(
          JSON.stringify({ isValid: true, mode: "phonetic", fallback: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
      
      console.log(`Word validation response for "${newWord}": ${aiResponse}`);
      
      if (aiResponse.startsWith("VALID")) {
        return new Response(
          JSON.stringify({ isValid: true, mode: "phonetic" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Extract reason if provided
        const reasonMatch = aiResponse.match(/INVALID:(.+)/);
        const reason = reasonMatch ? reasonMatch[1].trim() : "존재하지 않는 단어입니다";
        
        return new Response(
          JSON.stringify({ isValid: false, mode: "phonetic", reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For semantic mode, use AI to validate both word existence and semantic connection
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ isValid: true, mode: "semantic", fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `당신은 한국어 단어 연관성 검증 전문가입니다. 두 가지를 확인해야 합니다:

1. 단어 유효성: 새 단어가 실제 한국어 단어인지 확인
   - 표준국어대사전에 등재된 단어여야 함
   - 비속어, 욕설은 불허용
   - 의미 없는 음절 조합은 불허용

2. 의미적 연결: 두 단어가 의미적으로 연결되어 있는지 확인
   - 직접적인 동의어/반의어
   - 범주 관계 (학교-학생, 병원-의사)
   - 인과 관계 (비-우산, 불-연기)
   - 부분-전체 관계 (손-손가락, 나무-잎)
   - 연관 개념 (바다-물고기, 음악-악기)
   - 일반적인 연어 관계 (행복-미소, 성공-노력)

응답 형식:
- 둘 다 유효하면: "VALID"
- 단어가 유효하지 않으면: "INVALID_WORD:이유"
- 연결이 유효하지 않으면: "INVALID_CONNECTION:이유"`;

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
          { role: "user", content: `이전 단어: "${previousWord}"\n새 단어: "${newWord}"\n\n새 단어가 유효하고 두 단어가 의미적으로 연결되어 있나요?` }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ isValid: true, mode: "semantic", fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";
    
    console.log(`Semantic validation response for ${previousWord} → ${newWord}: ${aiResponse}`);
    
    if (aiResponse.startsWith("VALID")) {
      return new Response(
        JSON.stringify({ isValid: true, mode: "semantic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Extract reason
      let reason = "유효하지 않습니다";
      if (aiResponse.includes("INVALID_WORD:")) {
        const match = aiResponse.match(/INVALID_WORD:(.+)/);
        reason = match ? match[1].trim() : "존재하지 않는 단어입니다";
      } else if (aiResponse.includes("INVALID_CONNECTION:")) {
        const match = aiResponse.match(/INVALID_CONNECTION:(.+)/);
        reason = match ? match[1].trim() : "의미적 연결이 없습니다";
      }
      
      return new Response(
        JSON.stringify({ isValid: false, mode: "semantic", reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in chain-validate:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, isValid: true, fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
