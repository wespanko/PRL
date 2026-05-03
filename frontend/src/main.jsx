import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ensureSchemaVersion } from "./utils/schemaVersion";

// Run before React mounts — wipes stored data when CURRENT_SCHEMA_VERSION
// changes, so every tester starts fresh on their next page load.
ensureSchemaVersion();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
