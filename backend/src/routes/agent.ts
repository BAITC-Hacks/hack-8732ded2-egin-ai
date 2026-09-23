import { Router, type Request, type Response } from "express";
import { loadAllDatasets, type TurbineId } from "../agent/tools/dataset.js";
import { runAgentCycle } from "../agent/loop.js";
import type { AgentRunConfig } from "../agent/types.js";
import { getTurbineCoordinatesFromEnv, isTurbineId, parseTurbineCoordinates } from "../config/turbines.js";
import { parseForecastHorizon } from "../config/forecast.js";
import type { TurbineCoordinates } from "../weather/types.js";

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseRequest(body: unknown): Omit<AgentRunConfig, "trainPoints"> {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }
  const turbineId = body.turbineId;
  const issueDate = body.issueDate;
  const horizon = body.horizon ?? 48;
  if (!isTurbineId(turbineId)) {
    throw new Error("turbineId must be turbine-1 or turbine-2");
  }
  if (typeof issueDate !== "string") {
    throw new Error("issueDate must use YYYY-MM-DD format");
  }
  const horizonHours = parseForecastHorizon(horizon, "horizon");
  const coordinateInput = isRecord(body.coordinates) ? body.coordinates[turbineId] : undefined;
  const coordinates = coordinateInput === undefined
    ? getTurbineCoordinatesFromEnv(turbineId)
    : parseTurbineCoordinates(coordinateInput, turbineId);
  return {
    turbineId,
    issueDate,
    horizonHours,
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
