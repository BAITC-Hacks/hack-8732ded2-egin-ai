import type { ModelMetrics } from "../models/types.js";
import type { PowerCurveParameters } from "../models/types.js";
import type { TurbineId } from "../agent/tools/dataset.js";

export type HubHeightMeters = 10 | 80 | 100 | 120 | 180 | 200;

export interface TurbineCoordinates {
  latitude: number;
  longitude: number;
  hubHeight_m: HubHeightMeters;
}

export interface ArchivalForecastPoint {
  timestamp: string;
  windSpeed_ms: number;
}

export interface ForecastPoint extends ArchivalForecastPoint {
  predictedPower: number;
}

export interface WalkForwardConfig {
  coordinates: Record<TurbineId, TurbineCoordinates>;
  horizonHours: number;
}

export interface DailyForecastResult {
  issueDate: string;
  turbineId: TurbineId;
  horizonHours: number;
  forecast: ForecastPoint[];
}

export interface WalkForwardTurbineMetrics {
  parameters: PowerCurveParameters;
  metrics: ModelMetrics;
  evaluatedHours: number;
}

export type WalkForwardMetricsStatus = "actual_data_available" | "actual_data_unavailable";

export interface WalkForwardResponse {
  status: "success";
  source: "open-meteo-single-run";
  period: "2026-01-31 to 2026-02-28";
  powerScale: "normalized";
  dailyForecasts: DailyForecastResult[];
  overallMetrics: Record<TurbineId, WalkForwardTurbineMetrics> | null;
  metricsStatus: WalkForwardMetricsStatus;
}

export interface OpenMeteoHourlyResponse {
  hourly: {
    time: string[];
    windSpeed: number[];
  };
}
