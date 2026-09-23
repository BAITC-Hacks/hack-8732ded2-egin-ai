export type TurbineId = "turbine-1" | "turbine-2";

export interface DatasetQualityReport {
  totalRows: number;
  droppedRows: number;
  gapsDetected: number;
  notes: string[];
}

export interface HistoricalDataPoint {
  timestamp: string;
  windSpeed_ms: number;
  normalizedPower: number;
  temperature_C: number;
  turbineId: TurbineId;
}

export interface DatasetLoadResult {
  train: HistoricalDataPoint[];
  test: HistoricalDataPoint[];
  dataQuality: DatasetQualityReport;
}

export interface DatasetCollectionResponse {
  turbines: Record<TurbineId, DatasetLoadResult>;
}

export interface PowerCurveParameters {
  Cp: number;
  ratedPower: number;
  cutIn_ms: number;
  cutOut_ms: number;
}

export interface CalibrationMetrics {
  mae: number;
  rmse: number;
}

export interface CalibrationTurbineResult {
  params: PowerCurveParameters;
  metrics: CalibrationMetrics;
}

export interface CalibrationResponse {
  status: "success";
  powerScale: "normalized";
  turbines: Record<TurbineId, CalibrationTurbineResult>;
}

export interface DatasetUploadResponse {
  status: "success";
  uploaded: TurbineId[];
  message: string;
}
