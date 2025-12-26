import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { languages, type LanguageCode } from '@/i18n/config';

export const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 sm:h-10 px-2.5 sm:px-3 gap-1.5 sm:gap-2 rounded-full hover:bg-muted/80 border border-border/50 hover:border-border transition-all duration-200"
      >
        <span className="text-lg sm:text-xl drop-shadow-sm">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-xs font-semibold text-foreground">
          {currentLanguage.code.toUpperCase()}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[220px] bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{t("language.select")}</span>
                </div>
              </div>

              {/* Language list */}
              <div className="p-2 max-h-[320px] overflow-y-auto">
                {languages.map((lang, index) => {
                  const isActive = lang.code === i18n.language;
                  return (
                    <motion.button
                      key={lang.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'hover:bg-muted/80'
                      }`}
                    >
                      <span className="text-xl drop-shadow-sm">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold truncate ${
                          isActive ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {lang.nativeName}
                        </span>
                        <span className={`block text-[11px] truncate ${
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {lang.name}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center">
                  {t("language.hint")}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;