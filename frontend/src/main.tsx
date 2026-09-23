import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DashboardPage } from "@/pages/dashboard/ui/DashboardPage";
import "@/shared/i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(<StrictMode><DashboardPage /></StrictMode>);
