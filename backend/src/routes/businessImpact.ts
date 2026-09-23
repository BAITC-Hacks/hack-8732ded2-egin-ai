import { Router, type Request, type Response } from "express";
import { loadAllDatasets, type TurbineId } from "../agent/tools/dataset.js";
import { runAgentCycle } from "../agent/loop.js";
import { isTurbineId, getTurbineCoordinatesFromEnv, parseTurbineCoordinates } from "../config/turbines.js";
import { calculateWindFarmImpact } from "../business/impact.js";
import type {
  WindFarmCommercialConfig,
  WindFarmImpactInput,
  WindFarmTurbineConfig,
} from "../business/types.js";

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFiniteNumber(value: unknown, fieldName: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${fieldName} must be a number greater than or equal to ${minimum}`);
  }
  return value;
}

function parseNumberWithEnv(value: unknown, fieldName: string, envName: string, minimum: number): number {
  const rawValue = value ?? process.env[envName];
  if (rawValue === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  const numberValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
  return parseFiniteNumber(numberValue, fieldName, minimum);
}

function parseIssueDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("issueDate must use YYYY-MM-DD format");
  }
  return value;
}

function parseHorizon(value: unknown): number {
  const horizon = value ?? 48;
  if (typeof horizon !== "number" || !Number.isInteger(horizon) || horizon < 1 || horizon > 48) {
    throw new Error("horizon must be an integer between 1 and 48");
  }
  return horizon;
}

function parseTurbineConfigs(value: unknown): WindFarmTurbineConfig[] {
  const rawTurbines = value === undefined
    ? ["turbine-1", "turbine-2"]
    : value;
  if (!Array.isArray(rawTurbines) || rawTurbines.length === 0 || rawTurbines.length > 2) {
    throw new Error("turbines must contain one or two turbine configurations");
  }

  const seen = new Set<TurbineId>();
  return rawTurbines.map((rawTurbine: unknown): WindFarmTurbineConfig => {
    if (typeof rawTurbine === "string") {
      if (!isTurbineId(rawTurbine)) {
        throw new Error("turbineId must be turbine-1 or turbine-2");
      }
      if (seen.has(rawTurbine)) {
        throw new Error(`Duplicate configuration for ${rawTurbine}`);
      }
      seen.add(rawTurbine);
      return {
        turbineId: rawTurbine,
        coordinates: getTurbineCoordinatesFromEnv(rawTurbine),
        ratedPower_kW: parseNumberWithEnv(undefined, "ratedPower_kW", "TURBINE_RATED_POWER_KW", 0.001),
      };
    }
    if (!isRecord(rawTurbine) || !isTurbineId(rawTurbine.turbineId)) {
      throw new Error("Each turbine must contain a valid turbineId");
    }
    const turbineId = rawTurbine.turbineId;
    if (seen.has(turbineId)) {
      throw new Error(`Duplicate configuration for ${turbineId}`);
    }
    seen.add(turbineId);
    return {
      turbineId,
      coordinates: rawTurbine.coordinates === undefined
        ? getTurbineCoordinatesFromEnv(turbineId)
        : parseTurbineCoordinates(rawTurbine.coordinates, turbineId),
      ratedPower_kW: parseNumberWithEnv(
        rawTurbine.ratedPower_kW,
        "ratedPower_kW",
        "TURBINE_RATED_POWER_KW",
        0.001,
      ),
    };
  });
}

function parseCommercialConfig(value: unknown): WindFarmCommercialConfig {
  if (!isRecord(value)) {
    throw new Error("commercial configuration is required");
  }
  return {
    electricityPricePerMWh: parseNumberWithEnv(
      value.electricityPricePerMWh,
      "electricityPricePerMWh",
      "ELECTRICITY_PRICE_PER_MWH",
      0,
    ),
    imbalancePenaltyPerMWh: parseNumberWithEnv(
      value.imbalancePenaltyPerMWh,
      "imbalancePenaltyPerMWh",
      "IMBALANCE_PENALTY_PER_MWH",
      0,
    ),
    committedPower_kW: parseNumberWithEnv(
      value.committedPower_kW,
      "committedPower_kW",
      "COMMITTED_POWER_KW",
      0,
    ),
  };
}

function parseRequest(body: unknown): WindFarmImpactInput {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }
  return {
    issueDate: parseIssueDate(body.issueDate),
    horizonHours: parseHorizon(body.horizon),
    turbines: parseTurbineConfigs(body.turbines),
    commercial: parseCommercialConfig(body.commercial),
  };
}

router.post("/business-impact", async (request: Request, response: Response): Promise<void> => {
  try {
    const input = parseRequest(request.body as unknown);
    const datasets = await loadAllDatasets();
    const runs = await Promise.all(input.turbines.map((config) => runAgentCycle({
      turbineId: config.turbineId,
      issueDate: input.issueDate,
      horizonHours: input.horizonHours,
      coordinates: config.coordinates,
      trainPoints: datasets.turbines[config.turbineId].train,
    })));
    response.json(calculateWindFarmImpact(runs, input.turbines, input.commercial));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown business impact error";
    console.error(`[business-impact] ${message}`);
    response.status(400).json({ status: "error", error: message });
  }
});

export default router;
