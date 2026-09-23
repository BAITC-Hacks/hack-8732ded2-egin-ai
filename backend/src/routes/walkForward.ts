import { Router, type Request, type Response } from "express";
import type { TurbineId } from "../agent/tools/dataset.js";
import type { HubHeightMeters, TurbineCoordinates, WalkForwardConfig } from "../weather/types.js";
import { runWalkForwardSimulation } from "../services/walkForward.js";
import { parseForecastHorizon } from "../config/forecast.js";

const router = Router();
const TURBINE_IDS: readonly TurbineId[] = ["turbine-1", "turbine-2"];
const VALID_HUB_HEIGHTS: readonly HubHeightMeters[] = [10, 80, 100, 120, 180, 200];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
  return value;
}

function parseCoordinates(value: unknown, turbineId: TurbineId): TurbineCoordinates {
  if (!isRecord(value)) {
    throw new Error(`Missing coordinates for ${turbineId}`);
  }
  const latitude = parseNumber(value.latitude, `${turbineId}.latitude`);
  const longitude = parseNumber(value.longitude, `${turbineId}.longitude`);
  const hubHeightValue = value.hubHeight_m ?? 80;
  if (
    typeof hubHeightValue !== "number" ||
    !VALID_HUB_HEIGHTS.includes(hubHeightValue as HubHeightMeters)
  ) {
    throw new Error(`${turbineId}.hubHeight_m must be one of ${VALID_HUB_HEIGHTS.join(", ")}`);
  }
  return {
    latitude,
    longitude,
    hubHeight_m: hubHeightValue as HubHeightMeters,
  };
}

function getEnvCoordinates(turbineId: TurbineId): TurbineCoordinates | null {
  const prefix = turbineId === "turbine-1" ? "TURBINE_1" : "TURBINE_2";
  const latitude = process.env[`${prefix}_LATITUDE`];
  const longitude = process.env[`${prefix}_LONGITUDE`];
  if (latitude === undefined || longitude === undefined) {
    return null;
  }
  return parseCoordinates(
    {
      latitude: Number(latitude),
      longitude: Number(longitude),
      hubHeight_m: Number(process.env.WIND_HUB_HEIGHT_M ?? 80),
    },
    turbineId,
  );
}

function parseRequest(body: unknown): WalkForwardConfig {
  const requestBody = isRecord(body) ? body : {};
  const rawCoordinates = isRecord(requestBody.coordinates) ? requestBody.coordinates : {};
  const coordinates = {} as Record<TurbineId, TurbineCoordinates>;

  for (const turbineId of TURBINE_IDS) {
    const requestCoordinates = rawCoordinates[turbineId];
    coordinates[turbineId] = requestCoordinates === undefined
      ? getEnvCoordinates(turbineId) ?? (() => {
        throw new Error(`Provide coordinates for ${turbineId} in the request or .env`);
      })()
      : parseCoordinates(requestCoordinates, turbineId);
  }

  const horizonValue = requestBody.horizonHours ?? 48;
  return { coordinates, horizonHours: parseForecastHorizon(horizonValue, "horizonHours") };
}

router.post("/", async (request: Request, response: Response): Promise<void> => {
  let config: WalkForwardConfig;
  try {
    config = parseRequest(request.body as unknown);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown walk-forward error";
    console.error(`[walk-forward] ${message}`);
    response.status(400).json({ status: "error", error: message });
    return;
  }

  try {
    response.json(await runWalkForwardSimulation(config));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown walk-forward error";
    console.error(`[walk-forward] ${message}`);
    response.status(500).json({ status: "error", error: message });
  }
});

export default router;
