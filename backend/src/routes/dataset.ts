import { Router, type Request, type Response } from "express";
import {
  loadAllDatasets,
  loadTurbineDataset,
  type DatasetLoadResult,
  type TurbineId,
} from "../agent/tools/dataset.js";

const router = Router();

function isTurbineId(value: string): value is TurbineId {
  return value === "turbine_first" || value === "turbine_second";
}

router.get(
  "/",
  async (_request: Request, response: Response): Promise<void> => {
    try {
      response.json(await loadAllDatasets());
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown dataset loading error";
      console.error(`[dataset] ${message}`);
      response.status(500).json({ error: message });
    }
  },
);

router.get(
  "/:turbineId",
  async (request: Request, response: Response): Promise<void> => {
    const turbineIdParameter = request.params.turbineId;
    if (
      typeof turbineIdParameter !== "string" ||
      !isTurbineId(turbineIdParameter)
    ) {
      response
        .status(400)
        .json({ error: "turbineId must be turbine-1 or turbine-2" });
      return;
    }
    const turbineId: TurbineId = turbineIdParameter;

    try {
      const result: DatasetLoadResult = await loadTurbineDataset(turbineId);
      response.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown dataset loading error";
      console.error(`[dataset] ${message}`);
      response.status(500).json({ error: message });
    }
  },
);

export default router;
