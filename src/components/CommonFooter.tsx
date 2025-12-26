import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CommonFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-border bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/favicon.png"
              alt={t("brand.name")}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
            />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg sm:text-xl text-foreground leading-tight">
                {t("brand.name")}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">{t("brand.platformNo1")}</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              {t("menu.items.terms")}
            </a>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              {t("menu.items.privacy")}
            </a>
            <a
              href="https://hanoi.topikbot.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors font-medium"
            >
              {t("footer.hanoi")}
            </a>
            <Link to="/admin-login" className="hover:text-foreground transition-colors font-medium">
              {t("footer.admin")}
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-xs sm:text-sm shrink-0">{t("footer.commonCopyright")}</p>
        </div>
      </div>
    </footer>
  );
};

export default CommonFooter;