import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestCalibration } from "@/shared/api/operations";
import type { CalibrationResponse, CalibrationTurbineResult, TurbineId } from "@/entities/operations/model/types";

export function CalibrationPage(): ReactElement {
  const { t } = useTranslation();
  const [data, setData] = useState<CalibrationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadCalibration = async (): Promise<void> => {
    setIsLoading(true); setError(null);
    try { setData(await requestCalibration()); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : t("errors.unableToLoad")); } finally { setIsLoading(false); }
  };
  useEffect((): void => { void loadCalibration(); }, []);

  return <section className="space-y-6"><div><p className="text-sm font-medium text-cyan-700">{t("calibration.eyebrow")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("calibration.title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("calibration.description")}</p></div>{error !== null && <Card className="border-red-200"><CardContent className="flex items-center gap-3 p-5 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</CardContent></Card>}<div className="grid gap-4 md:grid-cols-2">{(["turbine-1", "turbine-2"] as const).map((turbineId: TurbineId) => <CalibrationCard key={turbineId} turbineId={turbineId} result={data?.turbines[turbineId] ?? null} isLoading={isLoading} />)}</div><div className="flex items-center justify-between rounded-2xl border bg-white p-4 text-sm text-muted-foreground"><span>{t("calibration.scale")}</span><Button variant="outline" onClick={() => void loadCalibration()} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />{t("common.refresh")}</Button></div></section>;
}

interface CalibrationCardProps { turbineId: TurbineId; result: CalibrationTurbineResult | null; isLoading: boolean; }
function CalibrationCard({ turbineId, result, isLoading }: CalibrationCardProps): ReactElement {
  const { t } = useTranslation();
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-cyan-700" />{t("calibration.turbine", { id: turbineId.replace("turbine-", "#") })}</CardTitle></CardHeader><CardContent>{isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100" /> : result === null ? <p className="text-sm text-muted-foreground">{t("calibration.noData")}</p> : <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Metric label="Cp" value={result.params.Cp.toFixed(3)} /><Metric label={t("calibration.ratedPower")} value={result.params.ratedPower.toFixed(3)} /><Metric label={t("calibration.cutIn")} value={`${result.params.cutIn_ms.toFixed(2)} m/s`} /><Metric label={t("calibration.cutOut")} value={`${result.params.cutOut_ms.toFixed(2)} m/s`} /></div><div className="grid grid-cols-2 gap-3 border-t pt-4"><Metric label="MAE" value={result.metrics.mae.toFixed(4)} /><Metric label="RMSE" value={result.metrics.rmse.toFixed(4)} /></div></div>}</CardContent></Card>;
}

interface MetricProps { label: string; value: string; }
function Metric({ label, value }: MetricProps): ReactElement { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
