import type { TurbineId } from "./tools/dataset.js";
import type { PowerCurveParameters, ModelMetrics } from "../models/types.js";
import type { ForecastPoint, TurbineCoordinates } from "../weather/types.js";

export type AgentStep =
  | "weather_fetched"
  | "data_prepared"
  | "model_run"
  | "forecast_generated"
  | "analyzed"
  | "rerun_triggered";

export type ForecastConfidence = "high" | "medium" | "low";

export interface AgentRunConfig {
  turbineId: TurbineId;
  issueDate: string;
  horizonHours: number;
  coordinates: TurbineCoordinates;
  trainPoints: import("./tools/dataset.js").HistoricalDataPoint[];
}

export interface AgentForecastPoint extends ForecastPoint {
  confidence: ForecastConfidence;
}

export interface AgentAnalysis {
  explanation: string;
  flaggedAnomalies: string[];
  source: "openai" | "deterministic-fallback";
}

export interface AgentRunResponse {
  status: "complete";
  turbineId: TurbineId;
  issueDate: string;
  horizonHours: number;
  steps: AgentStep[];
  hourly: AgentForecastPoint[];
  explanation: string;
  flaggedAnomalies: string[];
  analysisSource: AgentAnalysis["source"];
  parameters: PowerCurveParameters;
  metrics: ModelMetrics;
  rerunKey: string;
}
