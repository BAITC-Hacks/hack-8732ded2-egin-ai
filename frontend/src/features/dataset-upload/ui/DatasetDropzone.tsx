import { useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uploadDatasets } from "@/shared/api/operations";
import type { TurbineId } from "@/entities/operations/model/types";

interface DatasetDropzoneProps {
  turbineId: TurbineId;
}

export function DatasetDropzone({ turbineId }: DatasetDropzoneProps): ReactElement {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectFile = (candidate: File | undefined): void => {
    if (candidate === undefined) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setMessage(t("upload.csvOnly"));
      return;
    }
    setFile(candidate);
    setMessage(null);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files.item(0) ?? undefined);
  };

  const upload = async (): Promise<void> => {
    if (file === null) return;
    setIsUploading(true);
    setMessage(null);
    try {
      await uploadDatasets({ [turbineId]: file });
      setMessage(t("upload.saved"));
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : t("upload.failed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition ${isDragging ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-slate-50 hover:border-cyan-400"}`} onDragOver={(event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        <FileUp className="h-4 w-4 text-cyan-700" />
        <span className="min-w-0 flex-1 text-xs"><span className="font-semibold">{t("upload.turbine", { id: turbineId.replace("turbine-", "#") })}</span><span className="block truncate text-muted-foreground">{file?.name ?? t("upload.drop")}</span></span>
        <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => selectFile(event.target.files?.[0])} />
      </label>
      {file !== null && <button className="text-xs font-semibold text-cyan-700 disabled:opacity-50" type="button" disabled={isUploading} onClick={() => void upload()}>{isUploading ? <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />{t("upload.saving")}</> : <>{message === t("upload.saved") ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}{t("upload.save")}</>}</button>}
      {message !== null && <p className="text-[11px] text-muted-foreground">{message}</p>}
    </div>
  );
}
