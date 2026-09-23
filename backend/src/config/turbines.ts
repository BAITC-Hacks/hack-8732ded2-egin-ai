import type { TurbineId } from "../agent/tools/dataset.js";
import type { HubHeightMeters, TurbineCoordinates } from "../weather/types.js";

export const TURBINE_IDS: readonly TurbineId[] = ["turbine-1", "turbine-2"];
export const HUB_HEIGHTS: readonly HubHeightMeters[] = [10, 80, 100, 120, 180, 200];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTurbineId(value: unknown): value is TurbineId {
  return typeof value === "string" && TURBINE_IDS.includes(value as TurbineId);
}

export function parseTurbineCoordinates(
  value: unknown,
  turbineId: TurbineId,
): TurbineCoordinates {
  if (!isRecord(value)) {
    throw new Error(`Coordinates are required for ${turbineId}`);
  }
  const latitude = value.latitude;
  const longitude = value.longitude;
  const hubHeight = value.hubHeight_m ?? 80;
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    typeof hubHeight !== "number" || !HUB_HEIGHTS.includes(hubHeight as HubHeightMeters)
  ) {
    throw new Error(`Invalid coordinates for ${turbineId}`);
  }
  return { latitude, longitude, hubHeight_m: hubHeight as HubHeightMeters };
}

export function getTurbineCoordinatesFromEnv(turbineId: TurbineId): TurbineCoordinates {
  const prefix = turbineId === "turbine-1" ? "TURBINE_1" : "TURBINE_2";
  return parseTurbineCoordinates(
    {
      latitude: Number(process.env[`${prefix}_LATITUDE`]),
      longitude: Number(process.env[`${prefix}_LONGITUDE`]),
      hubHeight_m: Number(process.env.WIND_HUB_HEIGHT_M ?? 80),
    },
    turbineId,
  );
}
