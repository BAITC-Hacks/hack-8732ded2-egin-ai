import type { HistoricalDataPoint, TurbineId } from "../agent/tools/dataset.js";
import { calculateMetrics } from "../models/metrics.js";
import { fitPowerCurve, predictPower } from "../models/powerCurve.js";
import type {
  CalibrationSplit,
  ModelMetrics,
  PowerCurveParameters,
  TurbineCalibrationResult,
} from "../models/types.js";

const VALIDATION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function getPeriod(points: HistoricalDataPoint[]): { from: string; to: string } {
  if (points.length === 0) {
    throw new Error("Cannot create a period from an empty dataset");
  }
  return {
    from: points[0].timestamp,
    to: points[points.length - 1].timestamp,
  };
}

export function splitCalibrationData(
  trainPoints: HistoricalDataPoint[],
  validationDays: number = VALIDATION_DAYS,
): CalibrationSplit {
  if (trainPoints.length < 48 || validationDays <= 0) {
    throw new Error("Not enough train data for calibration and validation split");
  }

  const sortedPoints = [...trainPoints].sort(
    (first: HistoricalDataPoint, second: HistoricalDataPoint) =>
      Date.parse(first.timestamp) - Date.parse(second.timestamp),
  );
  const lastTimestamp = Date.parse(sortedPoints[sortedPoints.length - 1].timestamp);
  const validationStart = lastTimestamp - validationDays * DAY_MS;
  const calibration = sortedPoints.filter(
    (point: HistoricalDataPoint) => Date.parse(point.timestamp) < validationStart,
  );
  const validation = sortedPoints.filter(
    (point: HistoricalDataPoint) => Date.parse(point.timestamp) >= validationStart,
  );

  if (calibration.length === 0 || validation.length === 0) {
    throw new Error("Calibration split must contain both calibration and validation rows");
  }
  return { calibration, validation };
}

function calculateValidationMetrics(
  validation: HistoricalDataPoint[],
  parameters: PowerCurveParameters,
): ModelMetrics {
  return calculateMetrics(
    validation.map((point: HistoricalDataPoint) => ({
      actual: point.normalizedPower,
      predicted: predictPower(point.windSpeed_ms, parameters),
    })),
  );
}

export function calibrateTurbine(
  turbineId: TurbineId,
  trainPoints: HistoricalDataPoint[],
): TurbineCalibrationResult {
  const split = splitCalibrationData(trainPoints);
  const parameters = fitPowerCurve(split.calibration);
  const metrics = calculateValidationMetrics(split.validation, parameters);

  return {
    turbineId,
    parameters,
    metrics,
    calibrationPeriod: getPeriod(split.calibration),
    validationPeriod: getPeriod(split.validation),
    validationRows: split.validation.length,
  };
}
