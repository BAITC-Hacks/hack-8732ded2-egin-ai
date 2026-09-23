import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type { TurbineId } from "../agent/tools/dataset.js";

interface DatasetRow {
  csv_content: unknown;
}

interface RecordValue {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function getDatabasePath(): string {
  const configuredPath = process.env.DATASET_DB_PATH;
  return configuredPath === undefined || configuredPath.trim().length === 0
    ? fileURLToPath(new URL("../data/datasets.sqlite", import.meta.url))
    : path.resolve(configuredPath);
}

async function openDatabase(): Promise<DatabaseSync> {
  const databasePath = getDatabasePath();
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS datasets (
      turbine_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      csv_content TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )
  `);
  return database;
}

export async function saveDatasetCsv(
  turbineId: TurbineId,
  fileName: string,
  csvContent: string,
): Promise<void> {
  const database = await openDatabase();
  try {
    database.prepare(`
      INSERT INTO datasets (turbine_id, file_name, csv_content, uploaded_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(turbine_id) DO UPDATE SET
        file_name = excluded.file_name,
        csv_content = excluded.csv_content,
        uploaded_at = excluded.uploaded_at
    `).run(turbineId, fileName, csvContent, new Date().toISOString());
  } finally {
    database.close();
  }
}

export async function getDatasetCsv(turbineId: TurbineId): Promise<string | null> {
  const database = await openDatabase();
  try {
    const rawRow: unknown = database.prepare(
      "SELECT csv_content FROM datasets WHERE turbine_id = ?",
    ).get(turbineId);
    if (!isRecord(rawRow)) return null;
    const row: DatasetRow = { csv_content: rawRow.csv_content };
    return typeof row.csv_content === "string" ? row.csv_content : null;
  } finally {
    database.close();
  }
}
