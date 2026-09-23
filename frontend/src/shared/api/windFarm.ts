import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";
import type { BusinessImpactRequest, WindFarmImpactResponse } from "@/entities/wind-farm/model/types";

export async function requestWindFarmImpact(
  payload: BusinessImpactRequest,
): Promise<WindFarmImpactResponse> {
  const response: AxiosResponse<WindFarmImpactResponse> = await api.post<WindFarmImpactResponse>(
    "/wind-farm/business-impact",
    payload,
  );
  return response.data;
}
