import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/widgets/app-shell/ui/AppShell";
import { DashboardPage } from "@/pages/dashboard/ui/DashboardPage";
import { DataQualityPage } from "@/pages/data-quality/ui/DataQualityPage";
import { CalibrationPage } from "@/pages/calibration/ui/CalibrationPage";

export function AppRouter(): ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/forecast" replace />} />
        <Route path="/forecast" element={<DashboardPage />} />
        <Route path="/data-quality" element={<DataQualityPage />} />
        <Route path="/calibration" element={<CalibrationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/forecast" replace />} />
    </Routes>
  );
}
