import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Development-only: Validate i18n keys
if (import.meta.env.DEV) {
  import('./lib/i18nValidation').then(({ logI18nValidation }) => {
    logI18nValidation();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
