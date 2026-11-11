import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Jarvis reads chats, keys and settings from browser storage, so it renders only in the browser.
const JarvisApp = lazy(() => import("@/app/JarvisApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jarvis AI Assistant" },
      {
        name: "description",
        content:
          "Futuristic AI assistant with multi-provider API keys, conversation history, plugins and voice input.",
      },
      { property: "og:title", content: "Jarvis AI Assistant" },
      {
        property: "og:description",
        content:
          "Futuristic AI assistant with multi-provider API keys, conversation history, plugins and voice input.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return <div className="min-h-screen bg-background" />;
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <JarvisApp />
      </Suspense>
    </ClientOnly>
  );
}
