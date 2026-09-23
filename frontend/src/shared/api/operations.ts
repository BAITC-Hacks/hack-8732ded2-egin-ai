import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";
import type { CalibrationResponse, DatasetCollectionResponse } from "@/entities/operations/model/types";

export async function requestDatasetQuality(): Promise<DatasetCollectionResponse> {
  const response: AxiosResponse<DatasetCollectionResponse> = await api.get<DatasetCollectionResponse>("/dataset");
  return response.data;
}

export async function requestCalibration(): Promise<CalibrationResponse> {
  const response: AxiosResponse<CalibrationResponse> = await api.get<CalibrationResponse>("/calibrate");
  return response.data;
}
