import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CleanHeader from "@/components/CleanHeader";
import AppFooter from "@/components/AppFooter";

const Terms = () => {
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
            {t("terms.title")}
          </h1>
          <p className="text-muted-foreground italic mb-8">{t("terms.lastUpdated")}</p>

          {/* Article 1 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article1.title")}</h2>
          <p>{t("terms.article1.content")}</p>

          {/* Article 2 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article2.title")}</h2>
          <p className="mb-4">{t("terms.article2.intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article2.item1")}</li>
            <li>{t("terms.article2.item2")}</li>
            <li>{t("terms.article2.item3")}</li>
            <li>{t("terms.article2.item4")}</li>
            <li>{t("terms.article2.item5")}</li>
            <li>{t("terms.article2.item6")}</li>
            <li>{t("terms.article2.item7")}</li>
            <li>{t("terms.article2.item8")}</li>
            <li>{t("terms.article2.item9")}</li>
          </ul>

          {/* Article 3 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article3.title")}</h2>
          <p>{t("terms.article3.content")}</p>

          {/* Article 4 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article4.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article4.item1")}</li>
            <li>{t("terms.article4.item2")}</li>
          </ul>

          {/* Article 5 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article5.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article5.item1")}</li>
            <li>{t("terms.article5.item2")}</li>
            <li>{t("terms.article5.item3")}</li>
            <li>{t("terms.article5.item4")}</li>
          </ul>

          {/* Article 6 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article6.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article6.item1")}</li>
            <li>{t("terms.article6.item2")}</li>
            <li>{t("terms.article6.item3")}</li>
          </ul>

          {/* Article 7 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article7.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article7.item1")}</li>
            <li>{t("terms.article7.item2")}</li>
            <li>{t("terms.article7.item3")}</li>
            <li>{t("terms.article7.item4")}</li>
          </ul>

          {/* Article 8 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article8.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article8.item1")}</li>
            <li>{t("terms.article8.item2")}</li>
            <li>{t("terms.article8.item3")}</li>
          </ul>

          {/* Article 9 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article9.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article9.item1")}</li>
            <li>{t("terms.article9.item2")}</li>
          </ul>

          {/* Article 10 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article10.title")}</h2>
          <p className="mb-4">{t("terms.article10.intro")}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article10.item1")}</li>
            <li>{t("terms.article10.item2")}</li>
            <li>{t("terms.article10.item3")}</li>
            <li>{t("terms.article10.item4")}</li>
            <li>{t("terms.article10.item5")}</li>
            <li>{t("terms.article10.item6")}</li>
            <li>{t("terms.article10.item7")}</li>
            <li>{t("terms.article10.item8")}</li>
          </ul>

          {/* Article 11 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article11.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article11.item1")}</li>
            <li>{t("terms.article11.item2")}</li>
            <li>{t("terms.article11.item3")}</li>
            <li>{t("terms.article11.item4")}</li>
            <li>{t("terms.article11.item5")}</li>
          </ul>

          {/* Article 12 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article12.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article12.item1")}</li>
            <li>{t("terms.article12.item2")}</li>
            <li>{t("terms.article12.item3")}</li>
            <li>{t("terms.article12.item4")}</li>
          </ul>

          {/* Article 13 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article13.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article13.item1")}</li>
            <li>{t("terms.article13.item2")}</li>
          </ul>

          {/* Article 14 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article14.title")}</h2>
          <p>{t("terms.article14.content")}</p>

          {/* Article 15 */}
          <h2 className="text-2xl font-bold mt-8 mb-4">{t("terms.article15.title")}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t("terms.article15.item1")}</li>
            <li>{t("terms.article15.item2")}</li>
            <li>{t("terms.article15.item3")}</li>
            <li>{t("terms.article15.item4")}</li>
          </ul>
        </article>
      </main>

      <AppFooter />
    </div>
  );
};

export default Terms;
