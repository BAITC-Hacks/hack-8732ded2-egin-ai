import type { ReactElement } from "react";
import { AppProvider } from "@/app/providers/AppProvider";
import { AppRouter } from "@/app/router";

export function App(): ReactElement {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
