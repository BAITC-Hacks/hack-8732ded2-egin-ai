import type { HistoricalDataPoint } from "./tools/dataset.js";
import { calibrateTurbine } from "../services/calibration.js";
import { getArchivalForecast } from "../weather/client.js";
import type { ForecastConfidence, AgentAnalysis, AgentForecastPoint, AgentRunConfig, AgentRunResponse } from "./types.js";
import { analyzeWithOpenAi } from "./llm.js";
import type { AnalysisPromptInput, ParsedAnalysis } from "./prompts.js";
import { predictPower } from "../models/powerCurve.js";

function getRatedTransitionSpeed(cutIn_ms: number, cutOut_ms: number): number {
  return cutIn_ms + (cutOut_ms - cutIn_ms) * 0.35;
}

function classifyConfidence(
  windSpeed_ms: number,
  previousWindSpeed_ms: number | undefined,
  cutIn_ms: number,
  cutOut_ms: number,
): ForecastConfidence {
  const ratedTransition = getRatedTransitionSpeed(cutIn_ms, cutOut_ms);
  const nearNonlinearZone =
    Math.abs(windSpeed_ms - cutIn_ms) <= 1.5 ||
    Math.abs(windSpeed_ms - ratedTransition) <= 1.5 ||
    Math.abs(windSpeed_ms - cutOut_ms) <= 1.5;
  const sharpRamp =
    previousWindSpeed_ms !== undefined && Math.abs(windSpeed_ms - previousWindSpeed_ms) >= 3;
  if (nearNonlinearZone || sharpRamp) {
    return "low";
  }
  if (Math.abs(windSpeed_ms - ratedTransition) <= 3) {
    return "medium";
  }
  return "high";
}

function prepareWeatherData(
  points: Awaited<ReturnType<typeof getArchivalForecast>>,
): Awaited<ReturnType<typeof getArchivalForecast>> {
  if (points.length === 0) {
    throw new Error("Archival forecast returned no hourly points");
  }
  const prepared = [...points].sort(
    (first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp),
  );
  if (prepared.some((point) => !Number.isFinite(point.windSpeed_ms))) {
    throw new Error("Archival forecast contains a non-finite wind speed");
  }
  return prepared;
}

function generateHourlyForecast(
  weather: Awaited<ReturnType<typeof getArchivalForecast>>,
  parameters: AgentRunResponse["parameters"],
): AgentForecastPoint[] {
  return weather.map((point, index) => ({
    ...point,
    predictedPower: predictPower(point.windSpeed_ms, parameters),
    confidence: classifyConfidence(
      point.windSpeed_ms,
      weather[index - 1]?.windSpeed_ms,
      parameters.cutIn_ms,
      parameters.cutOut_ms,
    ),
  }));
}

function deterministicAnalysis(forecast: AgentForecastPoint[]): ParsedAnalysis {
  const lowConfidence = forecast.filter((point) => point.confidence === "low");
  const ramps = forecast.filter(
    (point, index) => index > 0 && Math.abs(point.windSpeed_ms - forecast[index - 1].windSpeed_ms) >= 3,
  );
  const first = forecast[0];
  const last = forecast[forecast.length - 1];
  const explanation = first === undefined || last === undefined
    ? "No forecast window was available for analysis."
    : `Forecast covers ${forecast.length} hours. Wind changes from ${first.windSpeed_ms.toFixed(1)} to ${last.windSpeed_ms.toFixed(1)} m/s; ${lowConfidence.length} hours are near nonlinear power-curve zones and need closer operational attention.`;
  const flaggedAnomalies = [
    ...(ramps.length > 0 ? [`${ramps.length} sharp wind ramp(s) exceed 3 m/s per hour.`] : []),
    ...(lowConfidence.length > 0 ? [`${lowConfidence.length} low-confidence hour(s) are near cut-in, rated transition, or cut-out.`] : []),
  ];
  return { explanation, flaggedAnomalies };
}

async function analyzeForecast(input: AnalysisPromptInput, forecast: AgentForecastPoint[]): Promise<AgentAnalysis> {
  try {
    const analysis = await analyzeWithOpenAi(input);
    return { ...analysis, source: "openai" };
  } catch (error: unknown) {
    console.warn(`[agent] LLM analysis fallback: ${error instanceof Error ? error.message : "unknown error"}`);
    return { ...deterministicAnalysis(forecast), source: "deterministic-fallback" };
  }
}

export async function runAgentCycle(config: AgentRunConfig): Promise<AgentRunResponse> {
  const steps: AgentRunResponse["steps"] = [];

  const weather = await getArchivalForecast(
    config.coordinates.latitude,
    config.coordinates.longitude,
    config.issueDate,
    config.horizonHours,
    config.coordinates.hubHeight_m,
  );
  steps.push("weather_fetched");

  const preparedWeather = prepareWeatherData(weather);
  steps.push("data_prepared");

  const calibration = calibrateTurbine(config.turbineId, config.trainPoints);
  steps.push("model_run");

  const hourly = generateHourlyForecast(preparedWeather, calibration.parameters);
  steps.push("forecast_generated");

  const analysis = await analyzeForecast(
    {
      turbineId: config.turbineId,
      issueDate: config.issueDate,
      forecast: hourly,
      parameters: calibration.parameters,
      metrics: calibration.metrics,
    },
    hourly,
  );
  steps.push("analyzed");

  steps.push("rerun_triggered");
  return {
    status: "complete",
    turbineId: config.turbineId,
    issueDate: config.issueDate,
    horizonHours: config.horizonHours,
    steps,
    hourly,
    explanation: analysis.explanation,
    flaggedAnomalies: analysis.flaggedAnomalies,
    analysisSource: analysis.source,
    parameters: calibration.parameters,
    metrics: calibration.metrics,
    rerunKey: `${config.turbineId}:${config.issueDate}:${config.horizonHours}`,
  };
}
