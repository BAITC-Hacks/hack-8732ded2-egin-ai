import type { HistoricalDataPoint, TurbineId } from "../agent/tools/dataset.js";
import { loadAllDatasets } from "../agent/tools/dataset.js";
import { calculateMetrics } from "../models/metrics.js";
import type { PredictionPair } from "../models/types.js";
import { runAgentCycle } from "../agent/loop.js";
import type {
  DailyForecastResult,
  ForecastPoint,
  TurbineCoordinates,
  WalkForwardConfig,
  WalkForwardResponse,
  WalkForwardTurbineMetrics,
} from "../weather/types.js";

const ISSUE_START = "2026-01-31";
const ISSUE_END = "2026-02-28";
const TEST_START = "2026-02-01T00:00:00.000Z";
const TEST_END = "2026-03-01T00:00:00.000Z";
const TURBINE_IDS: readonly TurbineId[] = ["turbine-1", "turbine-2"];

function addDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getIssueDates(): string[] {
  const dates: string[] = [];
  for (let date = ISSUE_START; date <= ISSUE_END; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function getActualByHour(points: HistoricalDataPoint[]): Map<string, number> {
  return new Map(
    points
      .filter((point: HistoricalDataPoint) => {
        const timestamp = Date.parse(point.timestamp);
        return timestamp >= Date.parse(TEST_START) && timestamp < Date.parse(TEST_END);
      })
      .filter((point: HistoricalDataPoint) => new Date(point.timestamp).getUTCMinutes() === 0)
      .map((point: HistoricalDataPoint) => [point.timestamp, point.normalizedPower]),
  );
}

function getEvaluationWindow(issueDate: string): { from: number; to: number } {
  const issueTimestamp = Date.parse(`${issueDate}T00:00:00.000Z`);
  return {
    from: issueTimestamp + 24 * 60 * 60 * 1000,
    to: issueTimestamp + 48 * 60 * 60 * 1000,
  };
}

async function simulateTurbine(
  turbineId: TurbineId,
  coordinates: TurbineCoordinates,
  trainPoints: HistoricalDataPoint[],
  testPoints: HistoricalDataPoint[],
  horizonHours: number,
): Promise<{
  dailyForecasts: DailyForecastResult[];
  metrics: WalkForwardTurbineMetrics;
}> {
  const actualByHour = getActualByHour(testPoints);
  if (actualByHour.size === 0) {
    throw new Error(`${turbineId} has no hourly rows in the February 2026 held-out test period`);
  }

  const pairs: PredictionPair[] = [];
  const dailyForecasts: DailyForecastResult[] = [];
  let modelParameters: WalkForwardTurbineMetrics["parameters"] | undefined;
  for (const issueDate of getIssueDates()) {
    const agentRun = await runAgentCycle({
      turbineId,
      issueDate,
      horizonHours,
      coordinates,
      trainPoints,
    });
    modelParameters = agentRun.parameters;
    const forecast: ForecastPoint[] = agentRun.hourly;
    dailyForecasts.push({ issueDate, turbineId, horizonHours, forecast });

    const evaluationWindow = getEvaluationWindow(issueDate);
    if (issueDate === ISSUE_END) {
      continue;
    }
    for (const point of forecast) {
      const timestamp = Date.parse(point.timestamp);
      const actual = actualByHour.get(point.timestamp);
      if (
        timestamp >= evaluationWindow.from &&
        timestamp < evaluationWindow.to &&
        actual !== undefined
      ) {
        pairs.push({ actual, predicted: point.predictedPower });
      }
    }
  }

  if (pairs.length === 0) {
    throw new Error(`${turbineId} produced no comparable hourly forecast/test pairs`);
  }
  if (modelParameters === undefined) {
    throw new Error(`${turbineId} did not produce calibrated parameters`);
  }

  return {
    dailyForecasts,
    metrics: {
      parameters: modelParameters,
      metrics: calculateMetrics(pairs),
      evaluatedHours: pairs.length,
    },
  };
}

export async function runWalkForwardSimulation(
  config: WalkForwardConfig,
): Promise<WalkForwardResponse> {
  if (config.horizonHours < 24 || config.horizonHours > 48) {
    throw new Error("Walk-forward horizonHours must be between 24 and 48");
  }

  const datasets = await loadAllDatasets();
  const dailyForecasts: DailyForecastResult[] = [];
  const overallMetrics = {} as WalkForwardResponse["overallMetrics"];

  for (const turbineId of TURBINE_IDS) {
    const result = await simulateTurbine(
      turbineId,
      config.coordinates[turbineId],
      datasets.turbines[turbineId].train,
      datasets.turbines[turbineId].test,
      config.horizonHours,
    );
    dailyForecasts.push(...result.dailyForecasts);
    overallMetrics[turbineId] = result.metrics;
  }

  return {
    status: "success",
    source: "open-meteo-historical-forecast",
    period: "2026-01-31 to 2026-02-28",
    powerScale: "normalized",
    dailyForecasts,
    overallMetrics,
  };
}
