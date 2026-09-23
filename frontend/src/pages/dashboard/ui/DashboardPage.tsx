import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
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
  const { t } = useTranslation();
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
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <ForecastForm values={values} isLoading={isLoading} error={error} onChange={updateValue} onSubmit={() => void runForecast()} />
      <section className="space-y-6"><div className="flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-sm font-medium text-cyan-700">{t("dashboard.overview")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("dashboard.description")}</p></div>{result !== null && <span className="rounded-full bg-white px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">{t("dashboard.issueDate")}: {result.issueDate}</span>}</div><WindFarmDashboard result={result} /></section>
    </div>
  );
}
