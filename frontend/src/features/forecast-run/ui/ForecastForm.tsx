import { CalendarDays, ChevronDown, Loader2, MapPin, Play, Settings2 } from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatasetDropzone } from "@/features/dataset-upload/ui/DatasetDropzone";
import type { ForecastFormValues } from "../model/types";

interface ForecastFormProps {
  values: ForecastFormValues;
  isLoading: boolean;
  error: string | null;
  onChange: (field: keyof ForecastFormValues, value: string) => void;
  onSubmit: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  type?: string;
  step?: string;
  onChange: (value: string) => void;
}

function Field({ label, value, type = "text", step, onChange }: FieldProps): ReactElement {
  return (
    <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Input type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function ForecastForm({ values, isLoading, error, onChange, onSubmit }: ForecastFormProps): ReactElement {
  const { t } = useTranslation();
  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-900">
          <Settings2 className="h-4 w-4 text-cyan-600" />
          <CardTitle>{t("form.title")}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t("form.description")}</p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("form.issueDate")} type="date" value={values.issueDate} onChange={(value) => onChange("issueDate", value)} />
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            <span>{t("form.horizon")}</span>
            <span className="relative block">
              <select
                className="h-10 w-full appearance-none rounded-lg border bg-background px-3 pr-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={values.horizon}
                onChange={(event) => onChange("horizon", event.target.value)}
              >
                <option value="24">{t("form.hours24")}</option>
                <option value="48">{t("form.hours48")}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4" />
            </span>
          </label>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-cyan-600" /> {t("form.coordinates")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("form.latitude")} type="number" step="any" value={values.latitude} onChange={(value) => onChange("latitude", value)} />
            <Field label={t("form.longitude")} type="number" step="any" value={values.longitude} onChange={(value) => onChange("longitude", value)} />
            <Field label={t("form.hubHeight")} type="number" step="1" value={values.hubHeight_m} onChange={(value) => onChange("hubHeight_m", value)} />
            <Field label={t("form.ratedPower")} type="number" step="1" value={values.ratedPower_kW} onChange={(value) => onChange("ratedPower_kW", value)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("form.sameSite")}</p>
          <div className="mt-4 space-y-2 rounded-xl bg-white p-3"><p className="text-xs font-semibold">{t("upload.title")}</p><DatasetDropzone turbineId="turbine-1" /><DatasetDropzone turbineId="turbine-2" /></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("form.electricityPrice")} type="number" step="any" value={values.electricityPricePerMWh} onChange={(value) => onChange("electricityPricePerMWh", value)} />
          <Field label={t("form.imbalancePenalty")} type="number" step="any" value={values.imbalancePenaltyPerMWh} onChange={(value) => onChange("imbalancePenaltyPerMWh", value)} />
          <Field label={t("form.committedPower")} type="number" step="any" value={values.committedPower_kW} onChange={(value) => onChange("committedPower_kW", value)} />
        </div>

        {error !== null && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Button className="w-full gap-2 bg-cyan-600 hover:bg-cyan-700" disabled={isLoading} onClick={onSubmit}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isLoading ? t("form.running") : t("form.run")}
        </Button>
        <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> {t("form.nextDay")}
        </p>
      </CardContent>
    </Card>
  );
}
