import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Development-only: Validate i18n keys and run smoke tests
if (import.meta.env.DEV) {
  import('./lib/i18nValidation').then(({ logI18nValidation, runWritingCacheSmokeTest }) => {
    logI18nValidation();
    runWritingCacheSmokeTest();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
