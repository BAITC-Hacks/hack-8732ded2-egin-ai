import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Activity, BarChart3, Database, LayoutDashboard, Settings2 } from "lucide-react";
import { ForecastForm } from "@/features/forecast-run/ui/ForecastForm";
import { initialForecastFormValues, type ForecastFormValues } from "@/features/forecast-run/model/types";
import { requestWindFarmImpact } from "@/shared/api/windFarm";
import type { BusinessImpactRequest, WindFarmImpactResponse } from "@/entities/wind-farm/model/types";
import { WindFarmDashboard } from "@/widgets/forecast-dashboard/ui/WindFarmDashboard";

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data;
    if (typeof responseData === "object" && responseData !== null && "error" in responseData) {
      const message = responseData.error;
      if (typeof message === "string") return message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function toNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number`);
  return parsed;
}

export function DashboardPage(): ReactElement {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<ForecastFormValues>(initialForecastFormValues);
  const [result, setResult] = useState<WindFarmImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const updateValue = (field: keyof ForecastFormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: field === "horizon" ? (Number(value) as 24 | 48) : value }));
  };

  const runForecast = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: BusinessImpactRequest = {
        issueDate: values.issueDate,
        horizon: values.horizon,
        turbines: [1, 2].map((index) => ({
          turbineId: `turbine-${index}` as "turbine-1" | "turbine-2",
          coordinates: { latitude: toNumber(values.latitude, t("form.latitude")), longitude: toNumber(values.longitude, t("form.longitude")), hubHeight_m: toNumber(values.hubHeight_m, t("form.hubHeight")) },
          ratedPower_kW: toNumber(values.ratedPower_kW, t("form.ratedPower")),
        })),
        commercial: {
          electricityPricePerMWh: toNumber(values.electricityPricePerMWh, t("form.electricityPrice")),
          imbalancePenaltyPerMWh: toNumber(values.imbalancePenaltyPerMWh, t("form.imbalancePenalty")),
          committedPower_kW: toNumber(values.committedPower_kW, t("form.committedPower")),
        },
      };
      setResult(await requestWindFarmImpact(payload));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("errors.unableToRun")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-cyan-300"><Activity className="h-5 w-5" /></div><div><p className="text-sm font-bold tracking-tight">{t("app.title")}</p><p className="text-xs text-muted-foreground">{t("app.subtitle")}</p></div></div><div className="flex items-center gap-4 text-sm text-muted-foreground"><span className="hidden items-center gap-2 md:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("app.apiConnected")}</span><select aria-label="Language" className="rounded-lg border bg-white px-2 py-1.5 text-xs font-medium text-slate-700" value={i18n.language} onChange={(event) => { const language = event.target.value; window.localStorage.setItem("windcast-language", language); void i18n.changeLanguage(language); }}><option value="ru">{t("languages.ru")}</option><option value="en">{t("languages.en")}</option><option value="kk">{t("languages.kk")}</option></select></div></div></header>
      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4"><div className="rounded-2xl border bg-slate-950 p-3 text-slate-300"><NavItem icon={<LayoutDashboard className="h-4 w-4" />} label={t("nav.dashboard")} active /><NavItem icon={<BarChart3 className="h-4 w-4" />} label={t("nav.forecast")} /><NavItem icon={<Database className="h-4 w-4" />} label={t("nav.dataQuality")} /><NavItem icon={<Settings2 className="h-4 w-4" />} label={t("nav.calibration")} /></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mode.label")}</p><p className="mt-2 font-semibold">{t("mode.value")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("mode.description")}</p></div><ForecastForm values={values} isLoading={isLoading} error={error} onChange={updateValue} onSubmit={() => void runForecast()} /></aside>
        <main className="space-y-6"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-sm font-medium text-cyan-700">{t("dashboard.overview")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("dashboard.description")}</p></div>{result !== null && <span className="rounded-full bg-white px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">{t("dashboard.issueDate")}: {result.issueDate}</span>}</div><WindFarmDashboard result={result} /></main>
      </div>
    </div>
  );
}

interface NavItemProps { icon: ReactElement; label: string; active?: boolean; }

function NavItem({ icon, label, active = false }: NavItemProps): ReactElement { return <div className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-white/10 text-white" : "text-slate-400"}`}>{icon}<span>{label}</span></div>; }
