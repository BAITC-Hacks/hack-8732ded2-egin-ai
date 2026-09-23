import type { AgentForecastPoint } from "./types.js";
import type { ModelMetrics, PowerCurveParameters } from "../models/types.js";

export interface AnalysisPromptInput {
  turbineId: string;
  issueDate: string;
  forecast: AgentForecastPoint[];
  parameters: PowerCurveParameters;
  metrics: ModelMetrics;
}

export interface ParsedAnalysis {
  explanation: string;
  flaggedAnomalies: string[];
}

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  return [
    "Analyze this wind turbine forecast as an energy operations assistant.",
    "Return strict JSON with exactly two fields: explanation (short string) and flaggedAnomalies (array of strings).",
    "Do not merely repeat numbers. Explain confidence zones near cut-in or rated-transition speeds and flag sharp wind or power ramps.",
    `Turbine: ${input.turbineId}; issue date: ${input.issueDate}; power scale: normalized.`,
    `Calibration parameters: ${JSON.stringify(input.parameters)}. Validation metrics: ${JSON.stringify(input.metrics)}.`,
    `Hourly forecast: ${JSON.stringify(input.forecast)}`,
  ].join("\n");
}

export function parseAnalysis(value: unknown): ParsedAnalysis {
  if (typeof value !== "object" || value === null) {
    throw new Error("LLM analysis must be an object");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.explanation !== "string" || !Array.isArray(record.flaggedAnomalies)) {
    throw new Error("LLM analysis has an invalid shape");
  }
  const flaggedAnomalies = record.flaggedAnomalies.filter(
    (item: unknown): item is string => typeof item === "string",
  );
  return { explanation: record.explanation, flaggedAnomalies };
}
