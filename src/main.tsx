import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Development-only: Validate i18n keys
if (import.meta.env.DEV) {
  // Run after initial paint to avoid slowing down the first render
  const run = () => {
    import("./lib/i18nValidation").then(({ logI18nValidation }) => {
      logI18nValidation("ko");
    });
  };

  // Prefer idle time if available
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 300);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
