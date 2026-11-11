// Standalone entry for the Android app: renders Jarvis directly, with no server.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import JarvisApp from "@/app/JarvisApp";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JarvisApp />
  </StrictMode>,
);
