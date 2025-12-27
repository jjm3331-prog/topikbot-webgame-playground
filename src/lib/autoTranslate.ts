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

export async function autoTranslateSegments(params: {
  segments: string[];
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string[]> {
  const { segments, sourceLanguage, targetLanguage } = params;

  if (!segments.length) return [];
  if (sourceLanguage === targetLanguage) return segments;

  const { data, error } = await supabase.functions.invoke("auto-translate", {
    body: {
      segments,
      sourceLanguage,
      targetLanguage,
    },
  });

  if (error) {
    throw new Error(error.message || "Translation failed");
  }

  const translations = (data?.translations as string[] | undefined) ?? [];
  if (!Array.isArray(translations) || translations.length !== segments.length) {
    throw new Error("SEGMENT_TRANSLATION_MISMATCH");
  }

  return translations;
}

