import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ghost, User, Reply, Flag, Languages, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoTranslateText } from "@/lib/autoTranslate";
import { toast } from "@/hooks/use-toast";
import { format, Locale } from "date-fns";

interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string | null;
  author_name: string | null;
  is_anonymous: boolean;
  content: string;
  like_count: number;
  created_at: string;
}

interface Author {
  name: string;
  avatar: string | null;
}

interface CommentItemProps {
  comment: Comment;
  author: Author;
  depth: number;
  dateLocale: Locale;
  onReply: () => void;
  onReport: () => void;
  renderChildren: () => React.ReactNode;
}

export function CommentItem({
  comment,
  author,
  depth,
  dateLocale,
  onReply,
  onReport,
  renderChildren,
}: CommentItemProps) {
  const { t, i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslate = async () => {
    // If already translated, toggle view
    if (translatedContent) {
      setShowTranslated(!showTranslated);
      return;
    }

    setIsTranslating(true);
    try {
      // Detect source language
      const hasKorean = /[가-힣]/.test(comment.content);
      const sourceLanguage = hasKorean ? "ko" : "vi";
      const targetLanguage = i18n.language;

      // Skip if same language
      if (targetLanguage === sourceLanguage) {
        toast({
          title: t("board.translation.sameLanguage"),
          description: t("board.translation.sameLanguageDesc"),
        });
        setIsTranslating(false);
        return;
      }

      const result = await autoTranslateText({
        text: comment.content,
        sourceLanguage,
        targetLanguage,
      });

      setTranslatedContent(result);
      setShowTranslated(true);
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

  const displayText = showTranslated && translatedContent ? translatedContent : comment.content;

  return (
    <div className={depth > 0 ? "ml-8 border-l-2 border-muted pl-4" : ""}>
      <div className="flex gap-3 py-4">
        <div className="shrink-0">
          {author.avatar ? (
            <img src={author.avatar} alt={author.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {comment.is_anonymous ? <Ghost className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{author.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap">{displayText}</p>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {/* Translation controls */}
            {showTranslated && translatedContent ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setShowTranslated(false)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {t("board.translation.showOriginal")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={handleTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {t("board.translation.translating")}
                  </>
                ) : (
                  <>
                    <Languages className="w-3 h-3 mr-1" />
                    {translatedContent 
                      ? t("board.translation.showTranslation") 
                      : t("board.translation.translate")}
                  </>
                )}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={onReply}
            >
              <Reply className="w-3 h-3 mr-1" />
              {t("board.reply")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={onReport}
            >
              <Flag className="w-3 h-3 mr-1" />
              {t("board.report")}
            </Button>
          </div>
        </div>
      </div>
      {renderChildren()}
    </div>
  );
}
