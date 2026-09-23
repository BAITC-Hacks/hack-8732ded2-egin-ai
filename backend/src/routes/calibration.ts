import { Router, type Request, type Response } from "express";
import { loadAllDatasets } from "../agent/tools/dataset.js";
import { calibrateTurbine } from "../services/calibration.js";
import { appendCalibrationLog } from "../services/calibrationLog.js";
import type {
  CalibrationApiResponse,
  CalibrationLogEntry,
  TurbineCalibrationResult,
} from "../models/types.js";

const router = Router();
const turbineIds = ["turbine-1", "turbine-2"] as const;

function toLogEntry(result: TurbineCalibrationResult): CalibrationLogEntry {
  return {
    timestamp: new Date().toISOString(),
    turbineId: result.turbineId,
    parameters: result.parameters,
    metrics: result.metrics,
    calibrationPeriod: result.calibrationPeriod,
    validationPeriod: result.validationPeriod,
  };
}

async function calculateCalibration(): Promise<{
  response: CalibrationApiResponse;
  logEntries: CalibrationLogEntry[];
}> {
  const datasets = await loadAllDatasets();
  const results = turbineIds.map((turbineId) =>
    calibrateTurbine(turbineId, datasets.turbines[turbineId].train),
  );
  const logEntries = results.map(toLogEntry);
  return {
    logEntries,
    response: {
      status: "success",
      powerScale: "normalized",
      turbines: {
        "turbine-1": { params: results[0].parameters, metrics: results[0].metrics },
        "turbine-2": { params: results[1].parameters, metrics: results[1].metrics },
      },
    },
  };
}

async function handleCalibration(
  shouldLog: boolean,
  response: Response,
): Promise<void> {
  try {
    const result = await calculateCalibration();
    if (shouldLog) {
      await appendCalibrationLog(result.logEntries);
    }
    response.json(result.response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown calibration error";
    console.error(`[calibration] ${message}`);
    response.status(500).json({ status: "error", error: message });
  }
}

router.get("/", async (_request: Request, response: Response): Promise<void> => {
  await handleCalibration(false, response);
});

router.post("/", async (_request: Request, response: Response): Promise<void> => {
  await handleCalibration(true, response);
});

export default router;
