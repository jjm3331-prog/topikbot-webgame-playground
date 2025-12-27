import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

const LANG_NAMES: Record<string, string> = {
  ko: "Korean",
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  ru: "Russian",
  uz: "Uzbek",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeCompanyName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function buildPrompts(companyName: string, targetLanguage: string) {
  const targetName = LANG_NAMES[targetLanguage] || targetLanguage;

  const systemPrompt = `You are a senior Korean-company research analyst.

CRITICAL RULES:
- Write the entire report in ${targetName} only.
- Do NOT mix other languages/scripts.
- Output in clean Markdown (no HTML), with clear headings and bullet points.
- Include years and sources for financial numbers when possible.
- Do not include <think> tags or hidden reasoning.
- If exact numbers are not available, clearly label as an estimate and explain the basis briefly.`;

  const userPrompt = `Create a comprehensive, practical company deep report about: ${companyName}.

Required sections:
1) 🏢 Company overview
2) 💰 Salary & benefits
3) 🏠 Culture & work-life balance
4) 📝 Interview process & real question examples (at least 5)
5) 📰 Latest news & recent trends (last 6-12 months)
6) 🎯 Advice for applicants

Research guidance (use web sources):
- JobPlanet, Blind, Glassdoor, LinkedIn
- Naver Blog / Tistory / Velog / Medium
- Official financial reports & press releases

Formatting:
- Use Markdown headings (##), numbered lists, and bullets.
- Keep the company name in English/Korean as appropriate, but the narrative must be ${targetName}.`;

  return { systemPrompt, userPrompt };
}

async function checkCache(supabase: any, cacheKey: string) {
  const { data } = await supabase
    .from("ai_response_cache")
    .select("response, id")
    .eq("cache_key", cacheKey)
    .eq("function_name", "company-deep-report")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data?.response) return null;

  try {
    await supabase.rpc("increment_cache_hit", { p_id: data.id });
  } catch {
    // ignore
  }

  return data.response;
}

async function saveCache(supabase: any, cacheKey: string, response: unknown, requestParams: unknown) {
  const expiresAt = new Date();
  // 30 days cache for cost control + language consistency
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase.from("ai_response_cache").upsert(
    {
      cache_key: cacheKey,
      function_name: "company-deep-report",
      response,
      request_params: requestParams,
      expires_at: expiresAt.toISOString(),
      hit_count: 0,
    },
    { onConflict: "cache_key" },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, targetLanguage } = await req.json();

    const normalizedCompany = normalizeCompanyName(companyName || "");
    const lang = (targetLanguage || "vi").toString();

    if (!normalizedCompany) {
      return new Response(JSON.stringify({ error: "Company name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "Perplexity API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cacheKey = `company_deep_report_v1_${lang}_${await sha256Hex(normalizedCompany.toLowerCase())}`;
    const cached = await checkCache(supabase, cacheKey);
    if (cached?.report) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[company-deep-report] generating: company=${normalizedCompany}, lang=${lang}`);

    const { systemPrompt, userPrompt } = buildPrompts(normalizedCompany, lang);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-reasoning-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8000,
        search_recency_filter: "year",
        return_citations: true,
        web_search_options: { search_context_size: "high" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    let report: string = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    // Remove any stray think tags
    report = report.replace(/<think>[\s\S]*?<\/think>/gi, "");
    report = report.replace(/<\/?think>/gi, "");
    report = report.replace(/^\s*\n\s*\n/gm, "\n\n").trim();

    const payload = { report, citations };
    await saveCache(supabase, cacheKey, payload, { companyName: normalizedCompany, targetLanguage: lang });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Company report error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate report";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
