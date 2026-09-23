import { Router, type Request, type Response } from "express";
import { loadAllDatasets, type TurbineId } from "../agent/tools/dataset.js";
import { runAgentCycle } from "../agent/loop.js";
import type { AgentRunConfig } from "../agent/types.js";
import type { HubHeightMeters, TurbineCoordinates } from "../weather/types.js";

const router = Router();
const TURBINE_IDS: readonly TurbineId[] = ["turbine-1", "turbine-2"];
const HUB_HEIGHTS: readonly HubHeightMeters[] = [10, 80, 100, 120, 180, 200];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCoordinates(value: unknown, turbineId: TurbineId): TurbineCoordinates {
  if (!isRecord(value)) {
    throw new Error(`Coordinates are required for ${turbineId}`);
  }
  const latitude = value.latitude;
  const longitude = value.longitude;
  const hubHeight = value.hubHeight_m ?? 80;
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) ||
    typeof longitude !== "number" || !Number.isFinite(longitude) ||
    typeof hubHeight !== "number" || !HUB_HEIGHTS.includes(hubHeight as HubHeightMeters)
  ) {
    throw new Error(`Invalid coordinates for ${turbineId}`);
  }
  return { latitude, longitude, hubHeight_m: hubHeight as HubHeightMeters };
}

function getCoordinatesFromEnv(turbineId: TurbineId): TurbineCoordinates {
  const prefix = turbineId === "turbine-1" ? "TURBINE_1" : "TURBINE_2";
  return parseCoordinates(
    {
      latitude: Number(process.env[`${prefix}_LATITUDE`]),
      longitude: Number(process.env[`${prefix}_LONGITUDE`]),
      hubHeight_m: Number(process.env.WIND_HUB_HEIGHT_M ?? 80),
    },
    turbineId,
  );
}

function parseRequest(body: unknown): Omit<AgentRunConfig, "trainPoints"> {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }
  const turbineId = body.turbineId;
  const issueDate = body.issueDate;
  const horizon = body.horizon ?? 48;
  if (typeof turbineId !== "string" || !TURBINE_IDS.includes(turbineId as TurbineId)) {
    throw new Error("turbineId must be turbine-1 or turbine-2");
  }
  if (typeof issueDate !== "string") {
    throw new Error("issueDate must use YYYY-MM-DD format");
  }
  if (typeof horizon !== "number" || !Number.isInteger(horizon) || horizon < 1 || horizon > 48) {
    throw new Error("horizon must be an integer between 1 and 48");
  }
  const coordinateInput = isRecord(body.coordinates) ? body.coordinates[turbineId] : undefined;
  const coordinates = coordinateInput === undefined
    ? getCoordinatesFromEnv(turbineId as TurbineId)
    : parseCoordinates(coordinateInput, turbineId as TurbineId);
  return {
    turbineId: turbineId as TurbineId,
    issueDate,
    horizonHours: horizon,
    coordinates,
  };
}

router.post("/run", async (request: Request, response: Response): Promise<void> => {
  try {
    const input = parseRequest(request.body as unknown);
    const datasets = await loadAllDatasets();
    response.json(await runAgentCycle({
      ...input,
      trainPoints: datasets.turbines[input.turbineId].train,
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown agent error";
    console.error(`[agent] ${message}`);
    response.status(400).json({ status: "error", error: message });
  }
});

export default router;
