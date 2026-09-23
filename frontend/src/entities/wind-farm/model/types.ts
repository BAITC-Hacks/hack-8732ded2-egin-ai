export type TurbineId = "turbine-1" | "turbine-2";
export type ForecastConfidence = "high" | "medium" | "low";
export type BusinessRiskLevel = "low" | "medium" | "high";

export interface TurbineCoordinatesInput {
  latitude: number;
  longitude: number;
  hubHeight_m: number;
}

export interface WindFarmTurbineInput {
  turbineId: TurbineId;
  coordinates: TurbineCoordinatesInput;
  ratedPower_kW: number;
}

export interface BusinessImpactRequest {
  issueDate: string;
  horizon: 24 | 48;
  turbines: WindFarmTurbineInput[];
  commercial: {
    electricityPricePerMWh: number;
    imbalancePenaltyPerMWh: number;
    committedPower_kW: number;
  };
}

export interface FarmHourlyBusinessImpact {
  timestamp: string;
  forecastPower_kW: number;
  committedPower_kW: number;
  deviationMWh: number;
  confidence: ForecastConfidence;
}

export interface TurbineBusinessImpact {
  turbineId: TurbineId;
  ratedPower_kW: number;
  expectedGenerationMWh: number;
  expectedRevenue: number;
  lowConfidenceHours: number;
  rampEvents: number;
}

export interface AgentRunSummary {
  analysisSource: "openai" | "deterministic-fallback";
  metrics: { mae: number; rmse: number };
  steps: string[];
}

export interface WindFarmImpactResponse {
  status: "success";
  issueDate: string;
  horizonHours: number;
  powerScale: "normalized";
  turbines: Record<TurbineId, TurbineBusinessImpact>;
  farm: {
    expectedGenerationMWh: number;
    expectedRevenue: number;
    imbalanceRiskMWh: number;
    potentialPenalty: number;
    riskLevel: BusinessRiskLevel;
    recommendation: string;
    hourly: FarmHourlyBusinessImpact[];
  };
  agentRuns: Partial<Record<TurbineId, AgentRunSummary>>;
}
