import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { languages, type LanguageCode } from "@/i18n/config";

interface TranslationDropdownProps {
  isTranslating: boolean;
  currentTranslatedLang: string | null;
  cachedLanguages: LanguageCode[];
  sourceLanguage: string;
  onTranslate: (targetLanguage: LanguageCode) => void;
  onShowOriginal: () => void;
  showingTranslated: boolean;
}

export function TranslationDropdown({
  isTranslating,
  currentTranslatedLang,
  cachedLanguages,
  sourceLanguage,
  onTranslate,
  onShowOriginal,
  showingTranslated,
}: TranslationDropdownProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const availableLanguages = languages.filter((lang) => lang.code !== sourceLanguage);

  const handleSelect = (code: LanguageCode) => {
    setOpen(false);
    if (code === sourceLanguage) {
      onShowOriginal();
    } else {
      onTranslate(code);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isTranslating}
          className="text-xs gap-1.5"
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("board.translation.translating")}
            </>
          ) : (
            <>
              <Languages className="w-3.5 h-3.5" />
              {showingTranslated && currentTranslatedLang
                ? languages.find((l) => l.code === currentTranslatedLang)?.flag
                : t("board.translation.selectLanguage")}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Show original option */}
        <DropdownMenuItem
          onClick={() => {
            setOpen(false);
            onShowOriginal();
          }}
          className="gap-2"
        >
          {languages.find((l) => l.code === sourceLanguage)?.flag || "📄"}{" "}
          {t("board.translation.showOriginal")}
          {!showingTranslated && <Check className="w-4 h-4 ml-auto text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        
        {/* Language options */}
        {availableLanguages.map((lang) => {
          const isCached = cachedLanguages.includes(lang.code);
          const isSelected = showingTranslated && currentTranslatedLang === lang.code;

          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="gap-2"
            >
              <span>{lang.flag}</span>
              <span className="flex-1">{lang.nativeName}</span>
              {isCached && !isSelected && (
                <span className="text-[10px] text-muted-foreground px-1 py-0.5 bg-muted rounded">
                  {t("board.translation.cached")}
                </span>
              )}
              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
