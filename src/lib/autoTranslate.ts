import { supabase } from "@/integrations/supabase/client";

export async function autoTranslateText(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  format?: "text" | "html";
}): Promise<string> {
  const { text, sourceLanguage, targetLanguage, format = "text" } = params;

  if (!text.trim()) return "";
  if (sourceLanguage === targetLanguage) return text;

  const { data, error } = await supabase.functions.invoke("auto-translate", {
    body: {
      text,
      sourceLanguage,
      targetLanguage,
      format,
    },
  });

  if (error) {
    throw new Error(error.message || "Translation failed");
  }

  return (data?.translation as string | undefined) ?? "";
}
