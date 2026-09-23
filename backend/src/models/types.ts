import type { HistoricalDataPoint, TurbineId } from "../agent/tools/dataset.js";

export interface PowerCurveParameters {
  Cp: number;
  ratedPower: number;
  cutIn_ms: number;
  cutOut_ms: number;
}

export interface PredictionPair {
  actual: number;
  predicted: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
}

export interface CalibrationSplit {
  calibration: HistoricalDataPoint[];
  validation: HistoricalDataPoint[];
}

export interface CalibrationPeriod {
  from: string;
  to: string;
}

export interface TurbineCalibrationResult {
  turbineId: TurbineId;
  parameters: PowerCurveParameters;
  metrics: ModelMetrics;
  calibrationPeriod: CalibrationPeriod;
  validationPeriod: CalibrationPeriod;
  validationRows: number;
}

export interface CalibrationLogEntry {
  timestamp: string;
  turbineId: TurbineId;
  parameters: PowerCurveParameters;
  metrics: ModelMetrics;
  calibrationPeriod: CalibrationPeriod;
  validationPeriod: CalibrationPeriod;
}

export interface CalibrationApiTurbineResult {
  params: PowerCurveParameters;
  metrics: ModelMetrics;
}

export interface CalibrationApiResponse {
  status: "success";
  powerScale: "normalized";
  turbines: Record<TurbineId, CalibrationApiTurbineResult>;
}
