import { useState } from "react";
import type { ReactElement } from "react";
import axios from "axios";
import { Activity, BarChart3, Database, LayoutDashboard, Settings2 } from "lucide-react";
import { ForecastForm } from "@/features/forecast-run/ui/ForecastForm";
import { initialForecastFormValues, type ForecastFormValues } from "@/features/forecast-run/model/types";
import { requestWindFarmImpact } from "@/shared/api/windFarm";
import type { BusinessImpactRequest, WindFarmImpactResponse } from "@/entities/wind-farm/model/types";
import { WindFarmDashboard } from "@/widgets/forecast-dashboard/ui/WindFarmDashboard";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data;
    if (typeof responseData === "object" && responseData !== null && "error" in responseData) {
      const message = responseData.error;
      if (typeof message === "string") return message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Unable to run forecast";
}

function toNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number`);
  return parsed;
}

export function DashboardPage(): ReactElement {
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
          coordinates: { latitude: toNumber(values.latitude, "Latitude"), longitude: toNumber(values.longitude, "Longitude"), hubHeight_m: toNumber(values.hubHeight_m, "Hub height") },
          ratedPower_kW: toNumber(values.ratedPower_kW, "Rated power"),
        })),
        commercial: {
          electricityPricePerMWh: toNumber(values.electricityPricePerMWh, "Electricity price"),
          imbalancePenaltyPerMWh: toNumber(values.imbalancePenaltyPerMWh, "Imbalance penalty"),
          committedPower_kW: toNumber(values.committedPower_kW, "Committed power"),
        },
      };
      setResult(await requestWindFarmImpact(payload));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-[1500px] items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-cyan-300"><Activity className="h-5 w-5" /></div><div><p className="text-sm font-bold tracking-tight">WINDCAST <span className="text-cyan-600">AI</span></p><p className="text-xs text-muted-foreground">Wind farm control center</p></div></div><div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> API connected</span><span>Operator workspace</span></div></div></header>
      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4"><div className="rounded-2xl border bg-slate-950 p-3 text-slate-300"><NavItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active /><NavItem icon={<BarChart3 className="h-4 w-4" />} label="Forecast" /><NavItem icon={<Database className="h-4 w-4" />} label="Data quality" /><NavItem icon={<Settings2 className="h-4 w-4" />} label="Calibration" /></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current mode</p><p className="mt-2 font-semibold">Historical simulation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Forecasts are issued as if the system were running day by day.</p></div><ForecastForm values={values} isLoading={isLoading} error={error} onChange={updateValue} onSubmit={() => void runForecast()} /></aside>
        <main className="space-y-6"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-sm font-medium text-cyan-700">Wind farm overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Operational forecast</h1><p className="mt-2 text-sm text-muted-foreground">Turn hourly wind predictions into dispatch and revenue decisions.</p></div>{result !== null && <span className="rounded-full bg-white px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">Issue date: {result.issueDate}</span>}</div><WindFarmDashboard result={result} /></main>
      </div>
    </div>
  );
}

interface NavItemProps { icon: ReactElement; label: string; active?: boolean; }

function NavItem({ icon, label, active = false }: NavItemProps): ReactElement { return <div className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-white/10 text-white" : "text-slate-400"}`}>{icon}<span>{label}</span></div>; }
