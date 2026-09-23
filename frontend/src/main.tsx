import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import "./index.css";

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-xl space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2"><p className="text-sm text-muted-foreground">React + Vite + TypeScript</p><h1 className="text-3xl font-bold">Frontend готов</h1></div>
        <p className="text-muted-foreground">Axios настроен в <code>src/lib/api.ts</code>, компоненты shadcn/ui — в <code>src/components/ui</code>.</p>
        <Button onClick={() => void import("@/lib/api").then(({ api }) => api.get("/health").catch(() => undefined))}>Проверить API</Button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
