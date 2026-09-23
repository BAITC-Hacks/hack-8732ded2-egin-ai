import type { HistoricalDataPoint } from "../agent/tools/dataset.js";
import type { PowerCurveParameters } from "./types.js";

const MIN_CP = 0.05;
const MAX_CP = 1.5;
const MIN_RATED_POWER = 0.5;
const MAX_RATED_POWER = 1.2;
const MIN_CUT_IN_MS = 0;
const MAX_CUT_IN_MS = 8;
const MIN_CUT_OUT_MS = 18;
const MAX_CUT_OUT_MS = 40;
const MAX_FIT_SAMPLE_SIZE = 5000;
const RATED_SPEED_POSITION = 0.35;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getRatedWindSpeed(parameters: PowerCurveParameters): number {
  return parameters.cutIn_ms +
    (parameters.cutOut_ms - parameters.cutIn_ms) * RATED_SPEED_POSITION;
}

function normalizeCandidateSample(points: HistoricalDataPoint[]): HistoricalDataPoint[] {
  if (points.length <= MAX_FIT_SAMPLE_SIZE) {
    return points;
  }

  const step = (points.length - 1) / (MAX_FIT_SAMPLE_SIZE - 1);
  return Array.from({ length: MAX_FIT_SAMPLE_SIZE }, (_value: undefined, index: number) =>
    points[Math.round(index * step)],
  );
}

function createCandidates(
  center: number,
  step: number,
  minimum: number,
  maximum: number,
): number[] {
  return Array.from({ length: 7 }, (_value: undefined, index: number) =>
    clamp(center + (index - 3) * step, minimum, maximum),
  ).filter((value: number, index: number, values: number[]) => values.indexOf(value) === index);
}

function calculateSquaredError(
  points: HistoricalDataPoint[],
  parameters: PowerCurveParameters,
): number {
  return points.reduce(
    (sum: number, point: HistoricalDataPoint) => {
      const error = point.normalizedPower - predictPower(point.windSpeed_ms, parameters);
      return sum + error ** 2;
    },
    0,
  );
}

function findBestParameters(
  points: HistoricalDataPoint[],
  current: PowerCurveParameters,
  cpStep: number,
  ratedPowerStep: number,
  cutInStep: number,
  cutOutStep: number,
): PowerCurveParameters {
  let best = current;
  let bestError = calculateSquaredError(points, best);

  for (const Cp of createCandidates(current.Cp, cpStep, MIN_CP, MAX_CP)) {
    for (const ratedPower of createCandidates(current.ratedPower, ratedPowerStep, MIN_RATED_POWER, MAX_RATED_POWER)) {
      const candidate: PowerCurveParameters = { ...current, Cp, ratedPower };
      const error = calculateSquaredError(points, candidate);
      if (error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
  }

  for (const cutIn_ms of createCandidates(best.cutIn_ms, cutInStep, MIN_CUT_IN_MS, MAX_CUT_IN_MS)) {
    for (const cutOut_ms of createCandidates(best.cutOut_ms, cutOutStep, MIN_CUT_OUT_MS, MAX_CUT_OUT_MS)) {
      if (cutOut_ms <= cutIn_ms + 5) {
        continue;
      }
      const candidate: PowerCurveParameters = { ...best, cutIn_ms, cutOut_ms };
      const error = calculateSquaredError(points, candidate);
      if (error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
  }

  return best;
}

export function predictPower(
  windSpeed_ms: number,
  parameters: PowerCurveParameters,
): number {
  if (!Number.isFinite(windSpeed_ms)) {
    throw new Error("Wind speed must be finite");
  }
  if (windSpeed_ms < parameters.cutIn_ms || windSpeed_ms >= parameters.cutOut_ms) {
    return 0;
  }

  const ratedWindSpeed = getRatedWindSpeed(parameters);
  const windPowerFraction =
    (windSpeed_ms ** 3 - parameters.cutIn_ms ** 3) /
    (ratedWindSpeed ** 3 - parameters.cutIn_ms ** 3);
  const predictedPower = parameters.ratedPower * parameters.Cp * windPowerFraction;
  return clamp(predictedPower, 0, parameters.ratedPower);
}

export function fitPowerCurve(trainPoints: HistoricalDataPoint[]): PowerCurveParameters {
  if (trainPoints.length < 24) {
    throw new Error("At least 24 training rows are required for power curve calibration");
  }

  const sample = normalizeCandidateSample(trainPoints);
  let parameters: PowerCurveParameters = {
    Cp: 0.8,
    ratedPower: 1,
    cutIn_ms: 3,
    cutOut_ms: 25,
  };

  const searchStages = [
    { cp: 0.2, ratedPower: 0.1, cutIn: 1, cutOut: 2 },
    { cp: 0.05, ratedPower: 0.03, cutIn: 0.25, cutOut: 0.5 },
    { cp: 0.01, ratedPower: 0.01, cutIn: 0.05, cutOut: 0.1 },
  ];

  for (const stage of searchStages) {
    parameters = findBestParameters(
      sample,
      parameters,
      stage.cp,
      stage.ratedPower,
      stage.cutIn,
      stage.cutOut,
    );
  }

  return parameters;
}
