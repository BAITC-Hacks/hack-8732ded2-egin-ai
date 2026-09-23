import type { ReactNode, ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/shared/i18n";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): ReactElement {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>{children}</BrowserRouter>
    </I18nextProvider>
  );
}
