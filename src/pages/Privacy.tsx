import { ChevronLeft, Mail, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CleanHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <nav className="mb-6" aria-label="breadcrumb">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">{t("common.back")}</span>
          </button>
        </nav>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="font-heading text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {t("privacy.title")}
          </h1>
          <p className="text-muted-foreground italic mb-8">{t("privacy.lastUpdated")}</p>

          {/* Section 1 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section1.title")}</h2>
          <p className="mb-4">{t("privacy.section1.intro")}</p>
          <p className="font-semibold">{t("privacy.section1.itemsTitle")}</p>
          <p className="mb-4">{t("privacy.section1.items")}</p>
          <p><strong>{t("privacy.section1.methodTitle")}</strong> {t("privacy.section1.method")}</p>

          {/* Section 2 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section2.title")}</h2>
          <p className="mb-4">{t("privacy.section2.intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("privacy.section2.item1")}</li>
            <li>{t("privacy.section2.item2")}</li>
            <li>{t("privacy.section2.item3")}</li>
          </ul>

          {/* Section 3 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section3.title")}</h2>
          <p>{t("privacy.section3.content")}</p>

          {/* Section 4 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section4.title")}</h2>
          <p>{t("privacy.section4.content")}</p>

          {/* Section 5 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section5.title")}</h2>
          <p className="mb-4">{t("privacy.section5.intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("privacy.section5.item1")}</li>
            <li>{t("privacy.section5.item2")}</li>
          </ul>

          {/* Section 6 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section6.title")}</h2>
          <p>{t("privacy.section6.content")}</p>

          {/* Section 7 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section7.title")}</h2>
          <p>{t("privacy.section7.content")}</p>

          {/* Section 8 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section8.title")}</h2>
          <p>{t("privacy.section8.content")}</p>

          {/* Section 9 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("privacy.section9.title")}</h2>
          <p>{t("privacy.section9.content")}</p>

          {/* Contact Card */}
          <section className="mt-10 not-prose">
            <div className="bg-gradient-to-br from-primary/10 to-korean-purple/10 p-6 rounded-2xl border border-border">
              <h2 className="font-heading font-bold text-lg mb-4 text-foreground">
                {t("privacy.contactTitle")}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">Jang Jinmin (장진민)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">(+82) 10-8647-0485</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <a href="mailto:jjm3331@naver.com" className="text-primary hover:underline">
                    jjm3331@naver.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>

      <AppFooter />
    </div>
  );
};

export default Privacy;
