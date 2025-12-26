import { supabase } from "@/integrations/supabase/client";

export async function autoTranslateText(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string> {
  const { text, sourceLanguage, targetLanguage } = params;

  if (!text.trim()) return "";
  if (sourceLanguage === targetLanguage) return text;

  const { data, error } = await supabase.functions.invoke("auto-translate", {
    body: {
      text,
      sourceLanguage,
      targetLanguage,
    },
  });

  if (error) {
    throw new Error(error.message || "Translation failed");
  }

  return (data?.translation as string | undefined) ?? "";
}
