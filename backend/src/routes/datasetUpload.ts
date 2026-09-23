import { Router, type Request, type Response } from "express";
import multer from "multer";
import { saveDatasetCsv } from "../storage/datasetDb.js";
import type { TurbineId } from "../agent/tools/dataset.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fileSize: 25 * 1024 * 1024 },
});
const fields = upload.fields([
  { name: "turbine-1", maxCount: 1 },
  { name: "turbine-2", maxCount: 1 },
]);

function getUploadedFiles(request: Request): Record<TurbineId, Express.Multer.File | undefined> {
  const files = request.files;
  if (files === undefined || Array.isArray(files)) return { "turbine-1": undefined, "turbine-2": undefined };
  return {
    "turbine-1": files["turbine-1"]?.[0],
    "turbine-2": files["turbine-2"]?.[0],
  };
}

router.post("/", fields, async (request: Request, response: Response): Promise<void> => {
  try {
    const files = getUploadedFiles(request);
    const uploaded: TurbineId[] = [];
    for (const turbineId of ["turbine-1", "turbine-2"] as const) {
      const file = files[turbineId];
      if (file === undefined) continue;
      if (!file.originalname.toLowerCase().endsWith(".csv")) {
        response.status(400).json({ status: "error", error: `${turbineId} file must have .csv extension` });
        return;
      }
      await saveDatasetCsv(turbineId, file.originalname, file.buffer.toString("utf8"));
      uploaded.push(turbineId);
    }
    if (uploaded.length === 0) {
      response.status(400).json({ status: "error", error: "Upload at least one CSV file using turbine-1 or turbine-2 field" });
      return;
    }
    response.status(201).json({ status: "success", uploaded, message: "CSV dataset saved to SQLite" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown dataset upload error";
    console.error(`[dataset-upload] ${message}`);
    response.status(400).json({ status: "error", error: message });
  }
});

export default router;
