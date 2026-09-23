import { AlertTriangle, BrainCircuit, CheckCircle2, Gauge, TrendingDown, Wind, Zap } from "lucide-react";
import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WindFarmImpactResponse } from "@/entities/wind-farm/model/types";
import { HourlyForecastChart } from "./HourlyForecastChart";

interface WindFarmDashboardProps {
  result: WindFarmImpactResponse | null;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function riskClasses(risk: WindFarmImpactResponse["farm"]["riskLevel"]): string {
  if (risk === "high") return "bg-red-50 text-red-700 ring-red-200";
  if (risk === "medium") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export function WindFarmDashboard({ result }: WindFarmDashboardProps): ReactElement {
  if (result === null) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center border-dashed bg-white/60">
        <div className="max-w-sm space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600"><Wind className="h-6 w-6" /></div>
          <h2 className="text-lg font-semibold text-slate-900">No forecast run yet</h2>
          <p className="text-sm leading-6 text-muted-foreground">Configure the wind farm on the left to see hourly generation, risk and recommended action.</p>
        </div>
      </Card>
    );
  }

  const { farm } = result;
  const lowConfidenceHours = farm.hourly.filter((point) => point.confidence === "low").length;
  const turbineValues = Object.values(result.turbines);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Zap className="h-4 w-4" />} label="Expected generation" value={`${farm.expectedGenerationMWh.toFixed(2)} MWh`} tone="cyan" />
        <MetricCard icon={<TrendingDown className="h-4 w-4" />} label="Expected revenue" value={money(farm.expectedRevenue)} tone="violet" />
        <MetricCard icon={<Gauge className="h-4 w-4" />} label="Imbalance risk" value={`${farm.imbalanceRiskMWh.toFixed(2)} MWh`} tone="amber" />
        <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Potential penalty" value={money(farm.potentialPenalty)} tone="red" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div><CardTitle>Hourly wind farm forecast</CardTitle><p className="mt-1 text-sm text-muted-foreground">{result.issueDate} issue date · {result.horizonHours} hours</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${riskClasses(farm.riskLevel)}`}>{farm.riskLevel} risk</span>
        </CardHeader>
        <CardContent><HourlyForecastChart points={farm.hourly} /></CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Wind turbine status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {turbineValues.map((turbine) => (
              <div key={turbine.turbineId} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div><p className="font-semibold text-slate-900">{turbine.turbineId}</p><p className="text-xs text-muted-foreground">{turbine.lowConfidenceHours} low-confidence hours · {turbine.rampEvents} ramp events</p></div>
                <div className="text-right"><p className="font-semibold text-slate-900">{turbine.expectedGenerationMWh.toFixed(2)} MWh</p><p className="text-xs text-muted-foreground">{money(turbine.expectedRevenue)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-100 bg-cyan-50/40">
          <CardHeader><div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-cyan-700" /><CardTitle>Agent recommendation</CardTitle></div></CardHeader>
          <CardContent className="space-y-4"><p className="text-base leading-7 text-slate-800">{farm.recommendation}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {lowConfidenceHours} hours require closer operational attention.</div></CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps { icon: ReactElement; label: string; value: string; tone: "cyan" | "violet" | "amber" | "red"; }

function MetricCard({ icon, label, value, tone }: MetricCardProps): ReactElement {
  const toneClasses: Record<MetricCardProps["tone"], string> = { cyan: "bg-cyan-50 text-cyan-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700" };
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</span><p className="text-right text-xl font-bold tracking-tight text-slate-900">{value}</p></div><p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p></CardContent></Card>;
}
