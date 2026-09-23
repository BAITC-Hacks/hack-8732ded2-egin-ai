import type { AxiosResponse } from "axios";
import { api } from "@/lib/api";
import type { CalibrationResponse, DatasetCollectionResponse, DatasetUploadResponse, TurbineId } from "@/entities/operations/model/types";

export async function requestDatasetQuality(): Promise<DatasetCollectionResponse> {
  const response: AxiosResponse<DatasetCollectionResponse> = await api.get<DatasetCollectionResponse>("/dataset");
  return response.data;
}

export async function requestCalibration(): Promise<CalibrationResponse> {
  const response: AxiosResponse<CalibrationResponse> = await api.get<CalibrationResponse>("/calibrate");
  return response.data;
}

export async function uploadDatasets(
  files: Partial<Record<TurbineId, File>>,
): Promise<DatasetUploadResponse> {
  const formData = new FormData();
  for (const turbineId of ["turbine-1", "turbine-2"] as const) {
    const file = files[turbineId];
    if (file !== undefined) formData.append(turbineId, file);
  }
  const response: AxiosResponse<DatasetUploadResponse> = await api.post<DatasetUploadResponse>("/dataset/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
  return response.data;
}
