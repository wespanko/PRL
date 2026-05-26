import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./index.css";
import App from "./App.jsx";
import { ensureSchemaVersion } from "./utils/schemaVersion";
import { initSentry } from "./sentry";

// Sentry first — so errors during schemaVersion or React init are captured.
// No-op unless VITE_SENTRY_DSN is set.
initSentry();

// Run before React mounts — wipes stored data when CURRENT_SCHEMA_VERSION
// changes, so every tester starts fresh on their next page load.
ensureSchemaVersion();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
