import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Gemini 2.5 Flash TTS voices
const VOICES = {
  female: "Kore",
  male: "Charon",
};

async function synthesizeTTS(text: string, voiceName: string): Promise<Uint8Array> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Read naturally and clearly in Korean, like a TOPIK exam audio. Moderate pace, clear pronunciation.\n\n${text}` 
          }]
        }],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: voiceName
              }
            }
          }
        }
      }),
    }
  );

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Gemini TTS failed (${resp.status}): ${t}`);
  }

  const data = await resp.json();
  const audioContent = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioContent) throw new Error("No audioContent returned from Gemini TTS");

  const binaryString = atob(audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// Detect speaker and split dialogue
function processDialogue(script: string): { speakerKey: "male" | "female"; text: string }[] {
  const lines = script.split(/\n/).filter(line => line.trim());
  const result: { speakerKey: "male" | "female"; text: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\s*(남자|여자|남성|여성|남|여)\s*[:：]\s*(.*)$/);
    
    if (match) {
      const label = match[1];
      const text = match[2].trim();
      if (text) {
        const speakerKey = ["여자", "여성", "여"].includes(label) ? "female" : "male";
        result.push({ speakerKey, text });
      }
    } else if (trimmed) {
      // Single speaker detected from prefix
      const isFemale = trimmed.startsWith("여자:") || trimmed.startsWith("여성:");
      result.push({ 
        speakerKey: isFemale ? "female" : "female", // Default to female if no prefix
        text: trimmed.replace(/^(남자|여자|남성|여성)\s*[:：]\s*/, "")
      });
    }
  }

  // If no structured dialogue, treat as single utterance
  if (result.length === 0 && script.trim()) {
    result.push({ speakerKey: "female", text: script.trim() });
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionIds } = await req.json();
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch questions
    const { data: questions, error: fetchError } = await supabase
      .from("mock_question_bank")
      .select("id, exam_type, part_number, question_number, instruction_text")
      .in("id", questionIds)
      .is("question_audio_url", null);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${questions?.length || 0} questions`);

    const results: { id: string; success: boolean; audioUrl?: string; error?: string }[] = [];

    for (const q of questions || []) {
      try {
        const script = q.instruction_text;
        if (!script) {
          results.push({ id: q.id, success: false, error: "No instruction_text" });
          continue;
        }

        console.log(`Generating audio for Q${q.question_number}: ${script.slice(0, 50)}...`);

        // Process dialogue
        const segments = processDialogue(script);
        
        // Generate audio for each segment
        const audioBuffers: Uint8Array[] = [];
        
        for (const seg of segments) {
          const voice = seg.speakerKey === "male" ? VOICES.male : VOICES.female;
          const audio = await synthesizeTTS(seg.text, voice);
          audioBuffers.push(audio);
          
          // Small delay between API calls
          await new Promise(r => setTimeout(r, 500));
        }

        // Concatenate audio buffers
        const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffers) {
          combined.set(buf, offset);
          offset += buf.length;
        }

        // Upload to storage
        const fileName = `listening/${q.exam_type}/${q.part_number}/${q.question_number}_${Date.now()}.wav`;
        
        const { error: uploadError } = await supabase.storage
          .from("podcast-audio")
          .upload(fileName, combined, {
            contentType: "audio/wav",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${q.id}:`, uploadError);
          results.push({ id: q.id, success: false, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("podcast-audio")
          .getPublicUrl(fileName);

        const audioUrl = urlData.publicUrl;

        // Update database
        const { error: updateError } = await supabase
          .from("mock_question_bank")
          .update({ question_audio_url: audioUrl })
          .eq("id", q.id);

        if (updateError) {
          console.error(`Update error for ${q.id}:`, updateError);
          results.push({ id: q.id, success: false, error: updateError.message });
          continue;
        }

        console.log(`✅ Q${q.question_number} audio saved: ${audioUrl}`);
        results.push({ id: q.id, success: true, audioUrl });

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error for ${q.id}:`, message);
        results.push({ id: q.id, success: false, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        successCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Batch audio error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
