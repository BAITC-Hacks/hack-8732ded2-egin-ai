export interface ForecastFormValues {
  issueDate: string;
  horizon: 24 | 48;
  latitude: string;
  longitude: string;
  hubHeight_m: string;
  ratedPower_kW: string;
  electricityPricePerMWh: string;
  imbalancePenaltyPerMWh: string;
  committedPower_kW: string;
}

export const initialForecastFormValues: ForecastFormValues = {
  issueDate: "2026-01-31",
  horizon: 24,
  latitude: "51.1694",
  longitude: "71.4491",
  hubHeight_m: "80",
  ratedPower_kW: "2000",
  electricityPricePerMWh: "50",
  imbalancePenaltyPerMWh: "100",
  committedPower_kW: "1500",
};
