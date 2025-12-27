import { useTranslation } from "react-i18next";
import { Ghost, User, Reply, Flag, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePostTranslation } from "@/components/board/PostTranslateButton";
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
  const { t } = useTranslation();
  const {
    displayText,
    isTranslated,
    isTranslating,
    translate,
    showOriginal,
    showTranslation,
    hasTranslation,
  } = usePostTranslation(comment.content);

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
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {/* Translation controls */}
            {!hasTranslation ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={translate}
                disabled={isTranslating}
              >
                <Languages className="w-3 h-3 mr-1" />
                {isTranslating ? t("board.translation.translating") : t("board.translation.translate")}
              </Button>
            ) : (
              <>
                {isTranslated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={showOriginal}
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t("board.translation.showOriginal")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={showTranslation}
                  >
                    <Languages className="w-3 h-3 mr-1" />
                    {t("board.translation.showTranslation")}
                  </Button>
                )}
              </>
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
