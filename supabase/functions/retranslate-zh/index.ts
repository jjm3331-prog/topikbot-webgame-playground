import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface VocabItem {
  id: string;
  word: string;
  meaning_zh: string | null;
}

// 미리 정의된 55개 짧은 중국어 번역 항목 ID
const SHORT_ZH_IDS = [
  "7291ba2f-f28e-4f83-a490-d6a2bcd3494f",
  "8e85df9b-e751-4c59-9c44-b3d4c9be28c8",
  "ac4b76ce-fb28-4fc0-915d-7f19f005b204",
  "a517c4d6-af2d-4f7d-bd32-cc3e3ef68f42",
  "88297331-2e7a-446c-820f-45762baf7ac8",
  "0c89d070-9b46-4d9a-a614-64e871b9161e",
  "74847a45-6522-42ed-a053-d38a5ca89ada",
  "720ee840-55c5-4948-b473-67e16572c4b2",
  "f94296e3-72b5-4dde-9330-0f682cd35c51",
  "5ae7185f-e5a7-4114-b02a-b095a74b20b7",
  "b3c45128-92a4-4501-ab87-087e86f502b2",
  "f1b86995-160b-41bd-a572-06fc306f9c01",
  "ed9d3cb4-1954-4cce-a46a-4da3e32f3f6a",
  "8d8a1f90-9a1b-43b0-8c8d-d87ae83d17bb",
  "d0487af7-2e30-46aa-8c8e-afa07cc95376",
  "5f3fde86-cdf8-4abb-8594-6054bb05995d",
  "6d62b046-1e35-41a7-b853-95a8277e5847",
  "4aa361d0-79fe-4a39-91e6-0e7b2b628f2f",
  "9ac0d574-ad34-4374-8198-b3e719000f1e",
  "4b0d4540-0c77-4eac-9881-7cc43cda0d66",
  "c01c3c12-106c-4805-9ef9-f63824abea4d",
  "ce0d66a2-35f2-4813-854b-07d1b32be628",
  "2e5cd062-12b6-44eb-85e5-df4444348623",
  "6f3870f8-2d7d-489b-b8de-2d1bb1dc4457",
  "b59ab90e-161d-45fd-9123-b6faa2b9377a",
  "1cf7fa95-c8c7-4762-957e-5ba4a0b37de2",
  "91fbd825-23f1-47e6-b26d-a2fc4cebcd88",
  "eb38472c-6f6b-46af-aa73-534ec2952695",
  "53d11236-c18a-4eca-b0b6-be9814ded00a",
  "71109ae0-54e1-4528-8ef4-8df46de172ca",
  "a1ba4107-d4d0-46ea-8ba8-a3e617ac1c98",
  "8ef815d6-6b4c-4168-a62d-3d14a0e75756",
  "c4e5fb86-afeb-49c5-b62a-ad495231b6ce",
  "255d4bb4-1e88-437f-a171-1ea4723f03e2",
  "4dc0522d-054e-4dca-aa00-1313f718d5a1",
  "2df6125c-2405-4448-ae6a-f8305c931e77",
  "2e6163ee-c7e2-41e9-8a66-cddca4b441de",
  "a0be724c-23b4-4b9c-910e-8bdd18ee7892",
  "8b28da63-2e4b-4901-aaf2-cef5851ece0b",
  "992d1dfa-c362-4830-bee1-47b7dd3db64b",
  "bb2bee98-b85f-4fb6-9b13-aa6763882bcd",
  "81d0792b-0453-4b65-9644-34d378cc547e",
  "aa9e2ffe-6466-4498-80cc-dfa5bad05f8b",
  "9057c3f4-f058-47c2-978b-0effe4603166",
  "f5f24688-4e88-40c6-bcc7-8dc2c824ff6b",
  "b2034478-c8f5-4834-a99c-a214d705ab2f",
  "419e138e-0760-4176-88b5-7f030616b5ae",
  "2c81f8c0-c177-43b5-8db4-535b6ae37d5e",
  "e7cdf01c-1efb-47ad-a810-72e058335605",
  "4e8f1cc5-7521-4b57-98d9-3caa9e1fa40c",
  "bd91b4fa-35ad-4655-b393-53ab00be7367",
  "1a97c4a2-22ef-4043-abcc-834cbd598c2d",
  "b6769ea3-4eac-45e5-8934-2f343d748e53",
  "c9ea72fc-eddd-4aa5-a993-740b3ea1e63b",
  "ced02ccd-33f5-4a53-9659-98b5e5c27e2b",
  "222c1c2b-b58b-48b1-a6d2-2a8949c49202",
  "093ccbba-9b7c-44dc-a18e-e805e3bc0fe2",
  "804b57c2-7e4f-4388-96a0-75f77f6c1f11",
  "0fc224cb-7ab6-4103-84a4-4de27911ef24",
  "ccf7710b-ad21-4bfe-bec8-6cf976aff1f9",
];

async function callGemini(words: VocabItem[]): Promise<{ id: string; meaning_zh: string }[]> {
  const wordList = words.map((w, i) => `${i + 1}. ${w.word} (현재: ${w.meaning_zh})`).join("\n");

  const systemPrompt = `You are a Korean-Chinese translator. For each Korean word, provide a Chinese translation that includes:
1. The Chinese characters (汉字)
2. The pinyin pronunciation in parentheses

Format: "汉字 (pīnyīn)"

Examples:
- 공항 → "机场 (jīchǎng)"
- 사랑하다 → "爱 (ài)"  
- 학교 → "学校 (xuéxiào)"
- 먹다 → "吃 (chī)"

Keep translations concise but always include pinyin with tone marks. Return ONLY a valid JSON array.`;

  const userPrompt = `Translate these ${words.length} Korean words to Chinese with pinyin:
${wordList}

Return JSON array format exactly like this:
[{"index": 1, "meaning_zh": "汉字 (pīnyīn)"}, {"index": 2, "meaning_zh": "汉字 (pīnyīn)"}, ...]`;

  console.log(`[Retranslate ZH] Calling Gemini for ${words.length} words...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Retranslate ZH] Gemini API error:", errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  
  console.log("[Retranslate ZH] Response length:", text.length);

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    console.error("[Retranslate ZH] No JSON found in:", text.substring(0, 300));
    throw new Error("No JSON array found in response");
  }

  const translations = JSON.parse(jsonMatch[0]);
  console.log(`[Retranslate ZH] Parsed ${translations.length} translations`);
  
  return words.map((w, i) => {
    const found = translations.find((t: any) => t.index === i + 1);
    return {
      id: w.id,
      meaning_zh: found?.meaning_zh || w.meaning_zh || "",
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch only the 60 items we identified
    const { data: items, error: fetchError } = await supabase
      .from("topik_vocabulary")
      .select("id, word, meaning_zh")
      .in("id", SHORT_ZH_IDS);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    console.log(`[Retranslate ZH] Found ${items?.length || 0} items to retranslate`);

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ message: "No items found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process in batches of 30
    const batchSize = 30;
    let successCount = 0;
    let errorCount = 0;
    const results: { word: string; old: string; new: string }[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`[Retranslate ZH] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);

      try {
        const translations = await callGemini(batch);

        for (const t of translations) {
          const original = batch.find((b: VocabItem) => b.id === t.id);
          
          const { error: updateError } = await supabase
            .from("topik_vocabulary")
            .update({ meaning_zh: t.meaning_zh })
            .eq("id", t.id);

          if (updateError) {
            console.error(`[Retranslate ZH] Update error for ${t.id}:`, updateError);
            errorCount++;
          } else {
            successCount++;
            results.push({
              word: original?.word || "unknown",
              old: original?.meaning_zh || "",
              new: t.meaning_zh,
            });
          }
        }
      } catch (batchError) {
        console.error(`[Retranslate ZH] Batch error:`, batchError);
        errorCount += batch.length;
      }
    }

    console.log(`[Retranslate ZH] Complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: "Retranslation complete",
        total: items.length,
        success: successCount,
        errors: errorCount,
        samples: results.slice(0, 15),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Retranslate ZH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
