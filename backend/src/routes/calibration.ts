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

router.post("/", async (_request: Request, response: Response): Promise<void> => {
  try {
    const datasets = await loadAllDatasets();
    const results = turbineIds.map((turbineId) =>
      calibrateTurbine(turbineId, datasets.turbines[turbineId].train),
    );

    await appendCalibrationLog(results.map(toLogEntry));

    const body: CalibrationApiResponse = {
      status: "success",
      powerScale: "normalized",
      turbines: {
        "turbine-1": {
          params: results[0].parameters,
          metrics: results[0].metrics,
        },
        "turbine-2": {
          params: results[1].parameters,
          metrics: results[1].metrics,
        },
      },
    };
    response.json(body);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown calibration error";
    console.error(`[calibration] ${message}`);
    response.status(500).json({ status: "error", error: message });
  }
});

export default router;
