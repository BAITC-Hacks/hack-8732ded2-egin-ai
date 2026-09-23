import type { AgentForecastPoint, AgentRunResponse } from "../agent/types.js";
import type { TurbineId } from "../agent/tools/dataset.js";
import type { TurbineCoordinates } from "../weather/types.js";

export type BusinessRiskLevel = "low" | "medium" | "high";

export interface WindFarmTurbineConfig {
  turbineId: TurbineId;
  coordinates: TurbineCoordinates;
  ratedPower_kW: number;
}

export interface WindFarmCommercialConfig {
  electricityPricePerMWh: number;
  imbalancePenaltyPerMWh: number;
  committedPower_kW: number;
}

export interface WindFarmImpactInput {
  issueDate: string;
  horizonHours: number;
  turbines: WindFarmTurbineConfig[];
  commercial: WindFarmCommercialConfig;
}

export interface TurbineBusinessImpact {
  turbineId: TurbineId;
  ratedPower_kW: number;
  expectedGenerationMWh: number;
  expectedRevenue: number;
  lowConfidenceHours: number;
  rampEvents: number;
}

export interface FarmHourlyBusinessImpact {
  timestamp: string;
  forecastPower_kW: number;
  committedPower_kW: number;
  deviationMWh: number;
  confidence: AgentForecastPoint["confidence"];
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
  agentRuns: Record<TurbineId, Pick<AgentRunResponse, "analysisSource" | "metrics" | "steps">>;
}
