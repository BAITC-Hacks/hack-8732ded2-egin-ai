export const MIN_FORECAST_HOURS = 24;
export const MAX_FORECAST_HOURS = 48;

export function parseForecastHorizon(value: unknown, fieldName: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < MIN_FORECAST_HOURS ||
    value > MAX_FORECAST_HOURS
  ) {
    throw new Error(`${fieldName} must be an integer between ${MIN_FORECAST_HOURS} and ${MAX_FORECAST_HOURS}`);
  }
  return value;
}
