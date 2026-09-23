import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestDatasetQuality } from "@/shared/api/operations";
import type { DatasetCollectionResponse, DatasetLoadResult, TurbineId } from "@/entities/operations/model/types";

export function DataQualityPage(): ReactElement {
  const { t } = useTranslation();
  const [data, setData] = useState<DatasetCollectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try { setData(await requestDatasetQuality()); } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : t("errors.unableToLoad")); } finally { setIsLoading(false); }
  };

  useEffect((): void => { void loadData(); }, []);

  return <section className="space-y-6"><div><p className="text-sm font-medium text-cyan-700">{t("dataQuality.eyebrow")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("dataQuality.title")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("dataQuality.description")}</p></div>{error !== null && <Card className="border-red-200"><CardContent className="flex items-center gap-3 p-5 text-sm text-red-700"><AlertTriangle className="h-5 w-5" />{error}</CardContent></Card>}<div className="grid gap-4 md:grid-cols-2">{(["turbine-1", "turbine-2"] as const).map((turbineId: TurbineId) => <DatasetCard key={turbineId} turbineId={turbineId} result={data?.turbines[turbineId] ?? null} isLoading={isLoading} />)}</div><div className="flex justify-end"><Button variant="outline" onClick={() => void loadData()} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />{t("common.refresh")}</Button></div></section>;
}

interface DatasetCardProps { turbineId: TurbineId; result: DatasetLoadResult | null; isLoading: boolean; }

function DatasetCard({ turbineId, result, isLoading }: DatasetCardProps): ReactElement {
  const { t } = useTranslation();
  const quality = result?.dataQuality;
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-cyan-700" />{t("dataQuality.turbine", { id: turbineId.replace("turbine-", "#") })}</CardTitle></CardHeader><CardContent>{isLoading ? <div className="h-24 animate-pulse rounded-xl bg-slate-100" /> : result === null ? <p className="text-sm text-muted-foreground">{t("dataQuality.noData")}</p> : <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><Metric label={t("dataQuality.trainRows")} value={result.train.length.toLocaleString()} /><Metric label={t("dataQuality.testRows")} value={result.test.length.toLocaleString()} /><Metric label={t("dataQuality.totalRows")} value={quality?.totalRows.toLocaleString() ?? "—"} /><Metric label={t("dataQuality.droppedRows")} value={quality?.droppedRows.toLocaleString() ?? "—"} /></div><div className="flex items-center gap-2 text-sm">{quality?.gapsDetected === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span>{t("dataQuality.gaps", { count: quality?.gapsDetected ?? 0 })}</span></div>{quality?.notes.length ? <ul className="space-y-1 text-xs text-muted-foreground">{quality.notes.slice(0, 4).map((note: string) => <li key={note}>• {note}</li>)}</ul> : <p className="text-xs text-muted-foreground">{t("dataQuality.noNotes")}</p>}</div>}</CardContent></Card>;
}

interface MetricProps { label: string; value: string; }
function Metric({ label, value }: MetricProps): ReactElement { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
