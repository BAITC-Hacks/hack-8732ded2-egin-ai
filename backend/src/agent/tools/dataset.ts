import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TurbineId = "turbine-1" | "turbine-2";

export interface HistoricalDataPoint {
  timestamp: string;
  windSpeed_ms: number;
  normalizedPower: number;
  temperature_C: number;
  turbineId: TurbineId;
}

export interface DatasetQualityReport {
  totalRows: number;
  droppedRows: number;
  gapsDetected: number;
  notes: string[];
}

export interface DatasetLoadResult {
  train: HistoricalDataPoint[];
  test: HistoricalDataPoint[];
  dataQuality: DatasetQualityReport;
}

export interface DatasetCollectionResponse {
  turbines: Record<TurbineId, DatasetLoadResult>;
}

interface CsvRow {
  values: string[];
  lineNumber: number;
}

interface ColumnIndexes {
  timestamp: number;
  windSpeed: number;
  normalizedPower: number;
  temperature: number;
}

const TRAIN_START = Date.parse("2023-03-11T00:00:00.000Z");
const TEST_START = Date.parse("2026-02-01T00:00:00.000Z");
const TEST_END = Date.parse("2026-03-01T00:00:00.000Z");
const MAX_WIND_SPEED_MS = 40;
const MIN_TEMPERATURE_C = -50;
const MAX_TEMPERATURE_C = 50;

const DEFAULT_DATA_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../src/data",
);

const FILES_BY_TURBINE: Record<TurbineId, string> = {
  "turbine-1": "turbine_first.csv",
  "turbine-2": "turbine_second.csv",
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .toLocaleLowerCase("ru-RU")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function parseCsvRecords(content: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;
  let lineNumber = 1;
  let rowStartLine = 1;

  const pushValue = (): void => {
    values.push(value.trim());
    value = "";
  };

  const pushRow = (): void => {
    pushValue();
    if (values.some((entry: string) => entry.length > 0)) {
      rows.push({ values, lineNumber: rowStartLine });
    }
    values = [];
    rowStartLine = lineNumber;
  };

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      pushValue();
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      pushRow();
      lineNumber += 1;
      continue;
    }

    value += character;
  }

  if (value.length > 0 || values.length > 0) {
    pushRow();
  }

  return rows;
}

function findColumnIndexes(headers: string[]): ColumnIndexes {
  const normalizedHeaders = headers.map(normalizeHeader);
  const find = (names: string[], label: string): number => {
    const index = normalizedHeaders.findIndex((header: string) =>
      names.some((name: string) => header === name || header.startsWith(name)),
    );
    if (index === -1) {
      throw new Error(`Required CSV column not found: ${label}`);
    }
    return index;
  };

  return {
    timestamp: find(["статистическоевремя", "timestamp", "datetime", "date"], "timestamp"),
    windSpeed: find(["средняяскоростьветра", "windspeed"], "average wind speed"),
    normalizedPower: find(["нормализованнаяактивнаямощность", "normalizedactivepower", "normalizedpower"], "normalized active power"),
    temperature: find(["средняятемператураокружающейсреды", "temperature"], "ambient temperature"),
  };
}

function parseTimestamp(rawTimestamp: string): number | null {
  const value = rawTimestamp.trim();
  const sourceFormatMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);

  if (sourceFormatMatch !== null) {
    const [, year, month, day, hour, minute, second = "0"] = sourceFormatMatch;
    const timestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    const parsedDate = new Date(timestamp);
    const isValidDate =
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day) &&
      parsedDate.getUTCHours() === Number(hour) &&
      parsedDate.getUTCMinutes() === Number(minute) &&
      parsedDate.getUTCSeconds() === Number(second);
    return Number.isNaN(timestamp) || !isValidDate ? null : timestamp;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFiniteNumber(rawValue: string): number | null {
  const normalizedValue = rawValue.trim().replace(",", ".");
  if (normalizedValue.length === 0) {
    return null;
  }
  const value = Number(normalizedValue);
  return Number.isFinite(value) ? value : null;
}

function toIsoTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function splitByOfficialDates(points: HistoricalDataPoint[]): Pick<DatasetLoadResult, "train" | "test"> {
  return {
    train: points.filter((point: HistoricalDataPoint) => {
      const timestamp = Date.parse(point.timestamp);
      return timestamp >= TRAIN_START && timestamp < TEST_START;
    }),
    test: points.filter((point: HistoricalDataPoint) => {
      const timestamp = Date.parse(point.timestamp);
      return timestamp >= TEST_START && timestamp < TEST_END;
    }),
  };
}

export async function loadDataset(
  filePath: string,
  turbineId: TurbineId,
): Promise<DatasetLoadResult> {
  const content = await fs.readFile(filePath, "utf8");
  const rows = parseCsvRecords(content);
  if (rows.length < 2) {
    throw new Error(`CSV file has no data rows: ${filePath}`);
  }

  const columnIndexes = findColumnIndexes(rows[0].values);
  const notes: string[] = [];
  const points: HistoricalDataPoint[] = [];
  const seenTimestamps = new Set<number>();
  let droppedRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  let outOfWindowRows = 0;

  for (const row of rows.slice(1)) {
    const rawTimestamp = row.values[columnIndexes.timestamp] ?? "";
    const timestamp = parseTimestamp(rawTimestamp);
    const windSpeed = parseFiniteNumber(row.values[columnIndexes.windSpeed] ?? "");
    const normalizedPower = parseFiniteNumber(row.values[columnIndexes.normalizedPower] ?? "");
    const temperature = parseFiniteNumber(row.values[columnIndexes.temperature] ?? "");

    if (timestamp === null || windSpeed === null || normalizedPower === null || temperature === null) {
      invalidRows += 1;
      droppedRows += 1;
      console.warn(`[dataset] Dropped ${filePath}:${row.lineNumber}: missing or invalid value`);
      continue;
    }

    if (seenTimestamps.has(timestamp)) {
      duplicateRows += 1;
      droppedRows += 1;
      console.warn(`[dataset] Dropped ${filePath}:${row.lineNumber}: duplicate timestamp ${rawTimestamp}`);
      continue;
    }

    const isInOfficialWindow = timestamp >= TRAIN_START && timestamp < TEST_END;
    const isInPlausibleRange =
      windSpeed >= 0 &&
      windSpeed <= MAX_WIND_SPEED_MS &&
      normalizedPower >= 0 &&
      normalizedPower <= 1 &&
      temperature >= MIN_TEMPERATURE_C &&
      temperature <= MAX_TEMPERATURE_C;

    if (!isInOfficialWindow) {
      outOfWindowRows += 1;
      droppedRows += 1;
      console.warn(`[dataset] Dropped ${filePath}:${row.lineNumber}: timestamp outside official train/test window`);
      continue;
    }

    if (!isInPlausibleRange) {
      invalidRows += 1;
      droppedRows += 1;
      console.warn(`[dataset] Dropped ${filePath}:${row.lineNumber}: value outside plausible range`);
      continue;
    }

    seenTimestamps.add(timestamp);
    points.push({
      timestamp: toIsoTimestamp(timestamp),
      windSpeed_ms: windSpeed,
      normalizedPower,
      temperature_C: temperature,
      turbineId,
    });
  }

  points.sort((first: HistoricalDataPoint, second: HistoricalDataPoint) =>
    Date.parse(first.timestamp) - Date.parse(second.timestamp),
  );

  let gapsDetected = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previousTimestamp = Date.parse(points[index - 1].timestamp);
    const currentTimestamp = Date.parse(points[index].timestamp);
    if (currentTimestamp - previousTimestamp > 60 * 60 * 1000) {
      gapsDetected += 1;
    }
  }

  if (invalidRows > 0) {
    notes.push(`${invalidRows} rows were dropped because values were missing, non-numeric, or outside plausible ranges.`);
  }
  if (duplicateRows > 0) {
    notes.push(`${duplicateRows} duplicate timestamp rows were dropped.`);
  }
  if (outOfWindowRows > 0) {
    notes.push(`${outOfWindowRows} rows outside 2023-03-11 through 2026-02-28 were dropped.`);
  }
  if (gapsDetected > 0) {
    notes.push(`${gapsDetected} gaps larger than one hour were detected after validation.`);
  }
  if (splitByOfficialDates(points).test.length === 0) {
    notes.push("No rows are currently available for the held-out February 2026 test period.");
  }
  if (notes.length === 0) {
    notes.push("No validation issues were detected.");
  }

  return {
    ...splitByOfficialDates(points),
    dataQuality: {
      totalRows: rows.length - 1,
      droppedRows,
      gapsDetected,
      notes,
    },
  };
}

export async function loadTurbineDataset(turbineId: TurbineId): Promise<DatasetLoadResult> {
  return loadDataset(path.join(DEFAULT_DATA_DIRECTORY, FILES_BY_TURBINE[turbineId]), turbineId);
}

export async function loadAllDatasets(
  dataDirectory: string = DEFAULT_DATA_DIRECTORY,
): Promise<DatasetCollectionResponse> {
  const entries = await Promise.all(
    (Object.entries(FILES_BY_TURBINE) as Array<[TurbineId, string]>).map(
      async ([turbineId, fileName]: [TurbineId, string]): Promise<[TurbineId, DatasetLoadResult]> => {
        const result = await loadDataset(path.join(dataDirectory, fileName), turbineId);
        return [turbineId, result];
      },
    ),
  );

  return { turbines: Object.fromEntries(entries) as Record<TurbineId, DatasetLoadResult> };
}
