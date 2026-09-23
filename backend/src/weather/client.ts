import type {
  ArchivalForecastPoint,
  HubHeightMeters,
  OpenMeteoHourlyResponse,
} from "./types.js";

function getWindVariable(hubHeight_m: HubHeightMeters): string {
  return `wind_speed_${hubHeight_m}m`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHourlyResponse(value: unknown, windVariable: string): OpenMeteoHourlyResponse {
  if (!isRecord(value) || !isRecord(value.hourly)) {
    throw new Error("Open-Meteo response does not contain hourly data");
  }

  const rawTimes: unknown = value.hourly.time;
  const rawWindSpeeds: unknown = value.hourly[windVariable];
  if (
    !Array.isArray(rawTimes) ||
    !Array.isArray(rawWindSpeeds) ||
    rawTimes.length !== rawWindSpeeds.length ||
    rawTimes.some((time: unknown) => typeof time !== "string") ||
    rawWindSpeeds.some((speed: unknown) => typeof speed !== "number" || !Number.isFinite(speed))
  ) {
    throw new Error(`Open-Meteo response has invalid ${windVariable} hourly data`);
  }

  return {
    hourly: {
      time: rawTimes as string[],
      windSpeed: rawWindSpeeds as number[],
    },
  };
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseForecastTimestamp(timestamp: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  const parsed = new Date(hasTimezone ? timestamp : `${timestamp}Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Open-Meteo response contains invalid timestamp: ${timestamp}`);
  }
  return parsed;
}

function assertIssueDate(issueDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
    throw new Error("issueDate must use YYYY-MM-DD format");
  }
  const parsed = new Date(`${issueDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== issueDate) {
    throw new Error(`Invalid issueDate: ${issueDate}`);
  }
  return parsed;
}

export async function getArchivalForecast(
  latitude: number,
  longitude: number,
  issueDate: string,
  horizonHours: number,
  hubHeight_m: HubHeightMeters = 80,
): Promise<ArchivalForecastPoint[]> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }
  if (!Number.isInteger(horizonHours) || horizonHours < 1 || horizonHours > 48) {
    throw new Error("horizonHours must be an integer between 1 and 48");
  }

  const issueStart = assertIssueDate(issueDate);
  const issueEnd = addHours(issueStart, horizonHours - 1);
  const windVariable = getWindVariable(hubHeight_m);
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: issueDate,
    end_date: toDateOnly(issueEnd),
    hourly: windVariable,
    timezone: "UTC",
    wind_speed_unit: "ms",
    timeformat: "iso8601",
  });

  const historicalForecastApi = process.env.OPEN_METEO_HISTORICAL_FORECAST_URL;
  if (historicalForecastApi === undefined || historicalForecastApi.trim().length === 0) {
    throw new Error("OPEN_METEO_HISTORICAL_FORECAST_URL is not configured");
  }
  const response = await fetch(`${historicalForecastApi}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Open-Meteo Historical Forecast API returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const parsed = parseHourlyResponse(payload, windVariable);
  const issueEndTimestamp = issueStart.getTime() + horizonHours * 60 * 60 * 1000;

  return parsed.hourly.time
    .map((timestamp: string, index: number): ArchivalForecastPoint => ({
      timestamp: parseForecastTimestamp(timestamp).toISOString(),
      windSpeed_ms: parsed.hourly.windSpeed[index],
    }))
    .filter((point: ArchivalForecastPoint) => {
      const timestamp = Date.parse(point.timestamp);
      return timestamp >= issueStart.getTime() && timestamp < issueEndTimestamp;
    });
}
