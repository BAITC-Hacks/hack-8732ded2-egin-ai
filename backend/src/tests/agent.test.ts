import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAnalysis, buildAnalysisPrompt } from "../agent/prompts.js";
import { calculateMetrics } from "../models/metrics.js";
import { predictPower } from "../models/powerCurve.js";
import type { PowerCurveParameters } from "../models/types.js";

const parameters: PowerCurveParameters = {
  Cp: 1,
  ratedPower: 1,
  cutIn_ms: 3,
  cutOut_ms: 25,
};

describe("power curve and metrics", () => {
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
