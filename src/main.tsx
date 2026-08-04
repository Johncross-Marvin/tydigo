import { createRoot } from "react-dom/client";
import { registerServiceWorker } from "@/lib/pwa";
import App from "./App.tsx";
import "./globals.css";

// Register service worker for PWA
if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_PWA !== "false") {
  registerServiceWorker().catch((err) =>
    console.warn("[Tydigo] SW registration skipped:", err)
  );
}

createRoot(document.getElementById("root")!).render(<App />);
