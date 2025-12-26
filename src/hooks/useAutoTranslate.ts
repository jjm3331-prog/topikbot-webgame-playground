import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { autoTranslateText } from "@/lib/autoTranslate";

export function useAutoTranslate(text: string, options?: { sourceLanguage?: string }) {
  const { i18n } = useTranslation();
  const sourceLanguage = options?.sourceLanguage ?? "vi";
  const targetLanguage = i18n.language;

  const normalized = useMemo(() => text.trim(), [text]);

  const query = useQuery({
    queryKey: ["auto-translate", sourceLanguage, targetLanguage, normalized],
    enabled: Boolean(normalized) && sourceLanguage !== targetLanguage,
    queryFn: async () =>
      autoTranslateText({
        text: normalized,
        sourceLanguage,
        targetLanguage,
      }),
    staleTime: 1000 * 60 * 60 * 24 * 30,
    gcTime: 1000 * 60 * 60 * 24 * 90,
    retry: 1,
  });

  return {
    text: sourceLanguage === targetLanguage ? normalized : query.data ?? normalized,
    isTranslating: query.isFetching,
    error: query.error,
    targetLanguage,
    sourceLanguage,
  };
}
