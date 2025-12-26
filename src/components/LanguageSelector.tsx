import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { languages, type LanguageCode } from '@/i18n/config';

export const LanguageSelector = () => {
  const { i18n } = useTranslation();
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
        className="h-8 sm:h-9 px-2 sm:px-3 gap-1 sm:gap-2 rounded-full hover:bg-muted"
      >
        <span className="text-base sm:text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-xs font-medium text-foreground">
          {currentLanguage.code.toUpperCase()}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
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
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[180px] bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-1">
                {languages.map((lang) => {
                  const isActive = lang.code === i18n.language;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          isActive ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {lang.nativeName}
                        </span>
                        <span className={`text-[10px] ${
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {lang.name}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeLanguage"
                          className="ml-auto w-2 h-2 bg-primary-foreground rounded-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
