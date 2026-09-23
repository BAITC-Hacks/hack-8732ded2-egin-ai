import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CalibrationLogEntry } from "../models/types.js";

const CALIBRATION_LOG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/data/calibration-log.json",
);

function isCalibrationLogEntry(value: unknown): value is CalibrationLogEntry {
  return typeof value === "object" && value !== null && "timestamp" in value && "turbineId" in value;
}

async function readCalibrationLog(): Promise<CalibrationLogEntry[]> {
  try {
    const content = await fs.readFile(CALIBRATION_LOG_PATH, "utf8");
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed) || !parsed.every(isCalibrationLogEntry)) {
      throw new Error("Calibration log has an invalid format");
    }
    return parsed;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function appendCalibrationLog(entries: CalibrationLogEntry[]): Promise<void> {
  if (entries.length === 0) {
    throw new Error("At least one calibration log entry is required");
  }

  const currentEntries = await readCalibrationLog();
  await fs.mkdir(path.dirname(CALIBRATION_LOG_PATH), { recursive: true });
  await fs.writeFile(
    CALIBRATION_LOG_PATH,
    `${JSON.stringify([...currentEntries, ...entries], null, 2)}\n`,
    "utf8",
  );
}
