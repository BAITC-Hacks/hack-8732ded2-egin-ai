import type { AgentRunResponse } from "../agent/types.js";
import type {
  BusinessRiskLevel,
  FarmHourlyBusinessImpact,
  TurbineBusinessImpact,
  WindFarmCommercialConfig,
  WindFarmImpactResponse,
  WindFarmTurbineConfig,
} from "./types.js";

function clampNormalizedPower(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function countRampEvents(run: AgentRunResponse): number {
  return run.hourly.filter(
    (point, index) => index > 0 && Math.abs(point.windSpeed_ms - run.hourly[index - 1].windSpeed_ms) >= 3,
  ).length;
}

function buildTurbineImpact(
  run: AgentRunResponse,
  config: WindFarmTurbineConfig,
  commercial: WindFarmCommercialConfig,
): TurbineBusinessImpact {
  const expectedGenerationMWh = run.hourly.reduce(
    (sum: number, point) => sum + (clampNormalizedPower(point.predictedPower) * config.ratedPower_kW) / 1000,
    0,
  );
  return {
    turbineId: config.turbineId,
    ratedPower_kW: config.ratedPower_kW,
    expectedGenerationMWh: round(expectedGenerationMWh),
    expectedRevenue: round(expectedGenerationMWh * commercial.electricityPricePerMWh),
    lowConfidenceHours: run.hourly.filter((point) => point.confidence === "low").length,
    rampEvents: countRampEvents(run),
  };
}

function getRiskLevel(imbalanceRiskMWh: number, expectedGenerationMWh: number, lowConfidenceHours: number, horizonHours: number): BusinessRiskLevel {
  const deviationRatio = imbalanceRiskMWh / Math.max(expectedGenerationMWh, 0.001);
  if (deviationRatio >= 0.25 || lowConfidenceHours >= Math.ceil(horizonHours * 0.25)) {
    return "high";
  }
  if (deviationRatio >= 0.1 || lowConfidenceHours > 0) {
    return "medium";
  }
  return "low";
}

function buildRecommendation(
  riskLevel: BusinessRiskLevel,
  expectedGenerationMWh: number,
  committedPower_kW: number,
  horizonHours: number,
): string {
  const committedGenerationMWh = (committedPower_kW * horizonHours) / 1000;
  if (riskLevel === "high" && expectedGenerationMWh < committedGenerationMWh) {
    return "Reduce the committed delivery or activate reserve capacity before the forecasted wind ramp-down.";
  }
  if (riskLevel === "high") {
    return "Keep reserve capacity available and review the wind farm dispatch plan before the forecast window.";
  }
  if (riskLevel === "medium") {
    return "Monitor the forecast during the transition hours and prepare a dispatch adjustment if the ramp persists.";
  }
  return "No immediate dispatch action is required; continue normal wind farm monitoring.";
}

export function calculateWindFarmImpact(
  runs: AgentRunResponse[],
  configs: WindFarmTurbineConfig[],
  commercial: WindFarmCommercialConfig,
): WindFarmImpactResponse {
  if (runs.length === 0 || configs.length === 0 || runs.length !== configs.length) {
    throw new Error("Agent runs and turbine configurations must be non-empty and have equal lengths");
  }

  const configByTurbine = new Map(configs.map((config) => [config.turbineId, config]));
  const turbineResults = runs.map((run) => {
    const config = configByTurbine.get(run.turbineId);
    if (config === undefined) {
      throw new Error(`Missing business configuration for ${run.turbineId}`);
    }
    return buildTurbineImpact(run, config, commercial);
  });

  const hourlyByTimestamp = new Map<string, { power_kW: number; confidence: AgentRunResponse["hourly"][number]["confidence"] }>();
  for (const run of runs) {
    const config = configByTurbine.get(run.turbineId);
    if (config === undefined) {
      throw new Error(`Missing business configuration for ${run.turbineId}`);
    }
    for (const point of run.hourly) {
      const current = hourlyByTimestamp.get(point.timestamp);
      const power_kW = (clampNormalizedPower(point.predictedPower) * config.ratedPower_kW);
      const confidence = current?.confidence === "low" || point.confidence === "low"
        ? "low"
        : current?.confidence === "medium" || point.confidence === "medium"
          ? "medium"
          : "high";
      hourlyByTimestamp.set(point.timestamp, {
        power_kW: (current?.power_kW ?? 0) + power_kW,
        confidence,
      });
    }
  }

  const hourly: FarmHourlyBusinessImpact[] = [...hourlyByTimestamp.entries()]
    .sort(([first], [second]) => Date.parse(first) - Date.parse(second))
    .map(([timestamp, value]) => ({
      timestamp,
      forecastPower_kW: round(value.power_kW),
      committedPower_kW: commercial.committedPower_kW,
      deviationMWh: round(Math.abs(value.power_kW - commercial.committedPower_kW) / 1000),
      confidence: value.confidence,
    }));

  const expectedGenerationMWh = turbineResults.reduce((sum, turbine) => sum + turbine.expectedGenerationMWh, 0);
  const expectedRevenue = expectedGenerationMWh * commercial.electricityPricePerMWh;
  const imbalanceRiskMWh = hourly.reduce((sum, point) => sum + point.deviationMWh, 0);
  const lowConfidenceHours = hourly.filter((point) => point.confidence === "low").length;
  const horizonHours = hourly.length;
  const riskLevel = getRiskLevel(imbalanceRiskMWh, expectedGenerationMWh, lowConfidenceHours, horizonHours);

  return {
    status: "success",
    issueDate: runs[0].issueDate,
    horizonHours,
    powerScale: "normalized",
    turbines: Object.fromEntries(turbineResults.map((result) => [result.turbineId, result])) as WindFarmImpactResponse["turbines"],
    farm: {
      expectedGenerationMWh: round(expectedGenerationMWh),
      expectedRevenue: round(expectedRevenue),
      imbalanceRiskMWh: round(imbalanceRiskMWh),
      potentialPenalty: round(imbalanceRiskMWh * commercial.imbalancePenaltyPerMWh),
      riskLevel,
      recommendation: buildRecommendation(riskLevel, expectedGenerationMWh, commercial.committedPower_kW, horizonHours),
      hourly,
    },
    agentRuns: Object.fromEntries(runs.map((run) => [run.turbineId, {
      analysisSource: run.analysisSource,
      metrics: run.metrics,
      steps: run.steps,
    }])) as WindFarmImpactResponse["agentRuns"],
  };
}
