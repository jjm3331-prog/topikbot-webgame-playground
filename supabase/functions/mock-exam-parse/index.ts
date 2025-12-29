import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  part_number: number;
  question_number: number;
}

const systemPrompt = `You are a TOPIK (Test of Proficiency in Korean) question parser. 
Your job is to extract structured question data from raw text input.

Rules:
1. Parse each question accurately, preserving the original Korean text exactly
2. Extract question number, question text, all options (①②③④), and identify the correct answer
3. Match explanations to questions if provided
4. Determine the part number from context clues like "[1~2]" or "※ [3~4]"
5. If correct answer is not explicitly stated, mark it as 1 (will need manual review)

Output format: Return a JSON array of questions with this exact structure:
{
  "questions": [
    {
      "question_text": "Full question text including any passage or context",
      "options": ["Option 1 text", "Option 2 text", "Option 3 text", "Option 4 text"],
      "correct_answer": 1-4 (number, not string),
      "explanation": "Explanation text if available, empty string if not",
      "part_number": 1-70 (section part based on question range),
      "question_number": actual question number
    }
  ]
}

IMPORTANT:
- Keep all Korean text exactly as provided - do NOT translate or modify
- Options should NOT include the number/symbol prefix (①②③④)
- correct_answer should be 1, 2, 3, or 4 (not 0-indexed)
- If question includes a passage like [보기], include it in question_text`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { examType, section, questionText, explanationText } = await req.json();

    if (!questionText) {
      return new Response(
        JSON.stringify({ error: "Question text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Parse the following TOPIK ${examType === 'topik1' ? 'I' : 'II'} ${section} questions:

=== QUESTIONS ===
${questionText}

${explanationText ? `=== EXPLANATIONS ===
${explanationText}` : ''}

Extract all questions and return them in the specified JSON format.`;

    console.log("Parsing questions for:", examType, section);

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to parse questions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI", questions: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { questions: ParsedQuestion[] };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean parsed questions
    const validQuestions = (parsed.questions || []).filter((q) => {
      return (
        q.question_text &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.correct_answer === "number" &&
        q.correct_answer >= 1 &&
        q.correct_answer <= 4
      );
    }).map((q) => ({
      ...q,
      explanation: q.explanation || "",
      part_number: q.part_number || 1,
      question_number: q.question_number || 0,
    }));

    console.log(`Parsed ${validQuestions.length} valid questions`);

    return new Response(
      JSON.stringify({ questions: validQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Parse error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
