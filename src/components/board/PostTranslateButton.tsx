import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Loader2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoTranslateText } from "@/lib/autoTranslate";
import { toast } from "@/hooks/use-toast";

interface PostTranslateButtonProps {
  text: string;
  onTranslated?: (translatedText: string) => void;
  className?: string;
  variant?: "button" | "inline";
}

// Simple in-memory cache for translations within session
const translationCache = new Map<string, string>();

export function PostTranslateButton({
  text,
  onTranslated,
  className = "",
  variant = "button",
}: PostTranslateButtonProps) {
  const { t, i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  const targetLanguage = i18n.language;
  const cacheKey = `${text.slice(0, 100)}_${targetLanguage}`;

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check cache first
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey)!;
      setTranslatedText(cached);
      setShowOriginal(false);
      onTranslated?.(cached);
      return;
    }

    setIsTranslating(true);
    
    try {
      // Detect source language (assume content might be in vi or ko)
      const hasKorean = /[가-힣]/.test(text);
      const sourceLanguage = hasKorean ? "ko" : "vi";
      
      // Skip if target is same as detected source
      if (targetLanguage === sourceLanguage || 
          (targetLanguage === "ko" && hasKorean) ||
          (targetLanguage === "vi" && !hasKorean)) {
        toast({ 
          title: t("board.translation.sameLanguage"),
          description: t("board.translation.sameLanguageDesc")
        });
        setIsTranslating(false);
        return;
      }

      const result = await autoTranslateText({
        text,
        sourceLanguage,
        targetLanguage,
      });

      // Cache the result
      translationCache.set(cacheKey, result);
      
      setTranslatedText(result);
      setShowOriginal(false);
      onTranslated?.(result);
      
      toast({ title: t("board.translation.success") });
    } catch (error) {
      console.error("Translation error:", error);
      toast({
        title: t("board.translation.error"),
        description: t("board.translation.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleShowOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOriginal(true);
  };

  const handleShowTranslation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOriginal(false);
  };

  if (variant === "inline") {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Content display */}
        <div className="text-sm">
          {showOriginal ? text : translatedText || text}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {!translatedText ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="h-7 text-xs text-muted-foreground hover:text-primary"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t("board.translation.translating")}
                </>
              ) : (
                <>
                  <Languages className="w-3 h-3 mr-1" />
                  {t("board.translation.translate")}
                </>
              )}
            </Button>
          ) : (
            <>
              {showOriginal ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowTranslation}
                  className="h-7 text-xs text-primary"
                >
                  <Languages className="w-3 h-3 mr-1" />
                  {t("board.translation.showTranslation")}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowOriginal}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t("board.translation.showOriginal")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleTranslate}
      disabled={isTranslating}
      className={`h-7 text-xs ${className}`}
    >
      {isTranslating ? (
        <>
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          {t("board.translation.translating")}
        </>
      ) : (
        <>
          <Languages className="w-3 h-3 mr-1" />
          {t("board.translation.translate")}
        </>
      )}
    </Button>
  );
}

// Hook for translatable content with state management
export function usePostTranslation(originalText: string) {
  const { i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  const targetLanguage = i18n.language;
  const cacheKey = `${originalText.slice(0, 100)}_${targetLanguage}`;

  const translate = async () => {
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    try {
      const hasKorean = /[가-힣]/.test(originalText);
      const sourceLanguage = hasKorean ? "ko" : "vi";
      
      const result = await autoTranslateText({
        text: originalText,
        sourceLanguage,
        targetLanguage,
      });

      translationCache.set(cacheKey, result);
      setTranslatedText(result);
      setShowOriginal(false);
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    displayText: showOriginal ? originalText : (translatedText || originalText),
    isTranslated: !showOriginal && !!translatedText,
    isTranslating,
    translate,
    showOriginal: () => setShowOriginal(true),
    showTranslation: () => setShowOriginal(false),
    hasTranslation: !!translatedText,
  };
}
