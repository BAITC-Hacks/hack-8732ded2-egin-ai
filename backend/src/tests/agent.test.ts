import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAnalysis, buildAnalysisPrompt } from "../agent/prompts.js";
import type { AgentForecastPoint, AgentRunResponse } from "../agent/types.js";
import { calculateWindFarmImpact } from "../business/impact.js";
import { calculateMetrics } from "../models/metrics.js";
import { predictPower } from "../models/powerCurve.js";
import type { PowerCurveParameters } from "../models/types.js";
import type { TurbineCoordinates } from "../weather/types.js";
import { parseForecastHorizon } from "../config/forecast.js";
import { buildSingleRunUrl } from "../weather/client.js";
import type { WalkForwardResponse } from "../weather/types.js";

const parameters: PowerCurveParameters = {
  Cp: 1,
  ratedPower: 1,
  cutIn_ms: 3,
  cutOut_ms: 25,
};

const coordinates: TurbineCoordinates = {
  latitude: 51.1694,
  longitude: 71.4491,
  hubHeight_m: 80,
};

function createAgentRun(turbineId: "turbine-1" | "turbine-2", hourly: AgentForecastPoint[]): AgentRunResponse {
  return {
    status: "complete",
    turbineId,
    issueDate: "2026-01-31",
    horizonHours: hourly.length,
    steps: ["weather_fetched", "data_prepared", "model_run", "forecast_generated", "analyzed", "rerun_triggered"],
    hourly,
    explanation: "Wind farm forecast analyzed.",
    flaggedAnomalies: [],
    analysisSource: "deterministic-fallback",
    parameters,
    metrics: { mae: 0.04, rmse: 0.06 },
    rerunKey: `${turbineId}:2026-01-31:${hourly.length}`,
  };
}

describe("power curve and metrics", () => {
  it("represents missing February actuals without hiding forecast output", () => {
    const response: WalkForwardResponse = {
      status: "success",
      source: "open-meteo-single-run",
      period: "2026-01-31 to 2026-02-28",
      powerScale: "normalized",
      dailyForecasts: [],
      overallMetrics: null,
      metricsStatus: "actual_data_unavailable",
    };
    assert.equal(response.metricsStatus, "actual_data_unavailable");
    assert.equal(response.overallMetrics, null);
  });

  it("builds an issue-date-specific Single Runs API request", () => {
    const url = buildSingleRunUrl(
      "https://single-runs-api.open-meteo.com/v1/forecast",
      coordinates.latitude,
      coordinates.longitude,
      "2026-01-31",
      48,
      "wind_speed_80m",
    );
    assert.equal(url.searchParams.get("run"), "2026-01-31T00:00");
    assert.equal(url.searchParams.get("models"), "ecmwf_ifs");
    assert.equal(url.searchParams.get("forecast_hours"), "72");
    assert.equal(url.searchParams.get("hourly"), "wind_speed_80m");
    assert.equal(url.hostname, "single-runs-api.open-meteo.com");
  });

  it("accepts only the required 24 to 48 hour forecast horizon", () => {
    assert.equal(parseForecastHorizon(24, "horizon"), 24);
    assert.equal(parseForecastHorizon(48, "horizon"), 48);
    assert.throws(() => parseForecastHorizon(23, "horizon"), /between 24 and 48/);
    assert.throws(() => parseForecastHorizon(49, "horizon"), /between 24 and 48/);
  });

  it("calculates MAE and RMSE from normalized predictions", () => {
    const metrics = calculateMetrics([
      { actual: 0, predicted: 0.1 },
      { actual: 0.5, predicted: 0.4 },
      { actual: 1, predicted: 0.8 },
    ]);
    assert.ok(Math.abs(metrics.mae - 0.13333333333333333) < 1e-12);
    assert.equal(Number(metrics.rmse.toFixed(6)), 0.141421);
  });

  it("clips power outside cut-in and cut-out speeds", () => {
    assert.equal(predictPower(2.9, parameters), 0);
    assert.equal(predictPower(25, parameters), 0);
    assert.ok(predictPower(8, parameters) > 0);
    assert.ok(predictPower(40, parameters) <= parameters.ratedPower);
  });
});

describe("agent analysis prompt", () => {
  it("parses structured analysis output", () => {
    assert.deepEqual(
      parseAnalysis({
        explanation: "Wind approaches the transition zone.",
        flaggedAnomalies: ["Sharp ramp at 04:00"],
      }),
      {
        explanation: "Wind approaches the transition zone.",
        flaggedAnomalies: ["Sharp ramp at 04:00"],
      },
    );
  });

  it("includes forecast context in the prompt", () => {
    const prompt = buildAnalysisPrompt({
      turbineId: "turbine-1",
      issueDate: "2026-01-31",
      forecast: [
        {
          timestamp: "2026-01-31T13:00:00.000Z",
          windSpeed_ms: 7.2,
          predictedPower: 0.55,
          confidence: "high",
        },
      ],
      parameters,
      metrics: { mae: 0.04, rmse: 0.06 },
    });
    assert.match(prompt, /turbine-1/);
    assert.match(prompt, /2026-01-31/);
    assert.match(prompt, /sharp wind or power ramps/);
  });
});

describe("wind farm business impact", () => {
  it("calculates generation, revenue, imbalance risk, and recommendation", () => {
    const result = calculateWindFarmImpact(
      [
        createAgentRun("turbine-1", [
          { timestamp: "2026-01-31T00:00:00.000Z", windSpeed_ms: 8, predictedPower: 0.5, confidence: "high" },
          { timestamp: "2026-01-31T01:00:00.000Z", windSpeed_ms: 5, predictedPower: 0.2, confidence: "low" },
        ]),
        createAgentRun("turbine-2", [
          { timestamp: "2026-01-31T00:00:00.000Z", windSpeed_ms: 8, predictedPower: 0.4, confidence: "high" },
          { timestamp: "2026-01-31T01:00:00.000Z", windSpeed_ms: 5, predictedPower: 0.3, confidence: "medium" },
        ]),
      ],
      [
        { turbineId: "turbine-1", coordinates, ratedPower_kW: 2000 },
        { turbineId: "turbine-2", coordinates, ratedPower_kW: 2000 },
      ],
      {
        electricityPricePerMWh: 50,
        imbalancePenaltyPerMWh: 100,
        committedPower_kW: 1500,
      },
    );

    assert.equal(result.farm.expectedGenerationMWh, 2.8);
    assert.equal(result.farm.expectedRevenue, 140);
    assert.equal(result.farm.imbalanceRiskMWh, 0.8);
    assert.equal(result.farm.potentialPenalty, 80);
    assert.equal(result.farm.riskLevel, "high");
    assert.match(result.farm.recommendation, /Reduce the committed delivery/);
    assert.equal(result.farm.hourly[0]?.forecastPower_kW, 1800);
  });
});
