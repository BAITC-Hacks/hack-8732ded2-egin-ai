import type { ModelMetrics, PredictionPair } from "./types.js";

function assertEqualLengths(actual: number[], predicted: number[]): void {
  if (actual.length === 0 || actual.length !== predicted.length) {
    throw new Error("Actual and predicted arrays must have the same non-zero length");
  }
}

function assertFiniteValues(values: number[], label: string): void {
  if (values.some((value: number) => !Number.isFinite(value))) {
    throw new Error(`${label} contains a non-finite value`);
  }
}

export function calculateMae(actual: number[], predicted: number[]): number {
  assertEqualLengths(actual, predicted);
  assertFiniteValues(actual, "Actual values");
  assertFiniteValues(predicted, "Predicted values");

  const absoluteErrorSum = actual.reduce(
    (sum: number, value: number, index: number) => sum + Math.abs(value - predicted[index]),
    0,
  );
  return absoluteErrorSum / actual.length;
}

export function calculateRmse(actual: number[], predicted: number[]): number {
  assertEqualLengths(actual, predicted);
  assertFiniteValues(actual, "Actual values");
  assertFiniteValues(predicted, "Predicted values");

  const squaredErrorSum = actual.reduce(
    (sum: number, value: number, index: number) => sum + (value - predicted[index]) ** 2,
    0,
  );
  return Math.sqrt(squaredErrorSum / actual.length);
}

export function calculateMetrics(pairs: PredictionPair[]): ModelMetrics {
  if (pairs.length === 0) {
    throw new Error("Cannot calculate metrics for an empty prediction set");
  }

  const actual = pairs.map((pair: PredictionPair) => pair.actual);
  const predicted = pairs.map((pair: PredictionPair) => pair.predicted);
  return {
    mae: calculateMae(actual, predicted),
    rmse: calculateRmse(actual, predicted),
  };
}
