---
name: strict-typescript
description: |
  Enforces mandatory, explicit TypeScript typing across both frontend and
  backend of the project. Triggers whenever Codex writes or edits any .ts
  or .tsx file — new functions, components, API handlers, data models,
  or shared types. Does NOT trigger for plain .js/.jsx files if the project
  intentionally keeps a file in JS (e.g. a config file) — check file
  extension and existing project convention first.
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

Every piece of code you write or edit in `.ts`/`.tsx` files must be explicitly and fully typed. No exceptions without a documented reason.

### 1. Function signatures

Every function — frontend component, backend handler, utility, tool call — must have explicit parameter types and an explicit return type. Do not rely on inference for anything exported or used across file boundaries.

```typescript
// Bad
export function calibrate(data) {
  return { Cp: 0.4, ratedPower: 2000 };
}

// Good
interface HistoricalDataPoint {
  timestamp: string;
  windSpeed_ms: number;
  power_kW: number;
}

interface CalibrationResult {
  Cp: number;
  ratedPower_kW: number;
  cutIn_ms: number;
  cutOut_ms: number;
}

export function calibrate(data: HistoricalDataPoint[]): CalibrationResult {
  // ...
  return { Cp: 0.4, ratedPower_kW: 2000, cutIn_ms: 3, cutOut_ms: 25 };
}
```

### 2. No `any`

`any` is not allowed anywhere in this project. If the shape of some data is genuinely unknown at that point (e.g. raw parsed CSV before validation), use `unknown` and narrow it explicitly, or define a proper type/interface for it.

```typescript
// Bad
function parseRow(row: any) { ... }

// Good
interface RawCsvRow {
  timestamp: string;
  power_kw: string; // raw CSV values are strings before parsing
  wind_speed?: string;
}
function parseRow(row: RawCsvRow): HistoricalDataPoint { ... }
```

### 3. Shared types between frontend and backend

Since this is a full-stack project (React frontend + Node/Express backend) sharing an API contract, define request/response types ONCE and reuse them on both sides — do not redefine the same shape twice with slightly different fields.

- Put shared API types in a common location (e.g. `/shared/types/api.ts` or a small shared package) if the project structure allows importing across `/frontend` and `/backend`.
- If frontend and backend are fully separate deployables with no shared import path, keep the types in sync manually but flag this explicitly in a comment: `// Must match backend/src/routes/forecast.js response shape`.

Example API contract type:

```typescript
export interface ForecastHourEntry {
  timestamp: string;
  windSpeed_ms: number;
  power_kW: number;
  confidence: "high" | "medium" | "low";
}

export interface ForecastResponse {
  hourly: ForecastHourEntry[];
  explanation: string;
  flaggedAnomalies: string[];
}
```

### 4. React component props

Every component must have a typed props interface, even for simple components:

```typescript
interface AgentExplanationProps {
  explanation: string;
  anomalies: string[];
}

export function AgentExplanation({
  explanation,
  anomalies,
}: AgentExplanationProps) {
  // ...
}
```

No inline `{ children }: { children: React.ReactNode }` scattered ad hoc if the component has more than one prop — define a named interface.

### 5. API boundaries — validate, don't just assert

At runtime boundaries (incoming HTTP request body, parsed CSV rows, external API responses like Open-Meteo), do not just cast with `as SomeType`. Validate the shape at runtime (e.g. with `zod`, which the developer already has experience with) and let the validated result carry the type.

```typescript
import { z } from "zod";

const ForecastQuerySchema = z.object({
  horizon: z.coerce.number().min(1).max(48),
});

// in the route handler:
const { horizon } = ForecastQuerySchema.parse(req.query);
```

### 6. Before finishing a task

- Run the TypeScript compiler in check mode, don't just rely on the editor:
  ```bash
  npx tsc --noEmit 2>&1 | tail -c 3000
  ```
- If there are type errors, fix them before considering the task done — do not suppress with `// @ts-ignore` unless there's no other option, and if you do, add a one-line comment explaining why.

## Constraints

- Never use `any` — use `unknown` + narrowing, or a proper type/interface
- Never leave an exported function, API handler, or component without explicit types
- Never duplicate an API contract type on both sides without a comment linking them
- Never suppress a type error with `@ts-ignore` without a one-line justification comment
- Always validate untrusted input (HTTP requests, parsed files, external API responses) at runtime, not just via type assertion
