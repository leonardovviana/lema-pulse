import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versão disponível. Atualizar agora?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("[PWA] App pronto para uso offline");
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates every 30 minutes
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);
