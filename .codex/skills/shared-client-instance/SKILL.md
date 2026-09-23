---
name: shared-client-instance
description: |
  Enforces a single, shared instance of QueryClient (TanStack Query) and the
  API client across the React frontend, instead of creating new instances
  in different components which causes lost cache, duplicate requests, and
  inconsistent state. Triggers whenever Codex adds a new component that
  fetches data, uses useQuery/useMutation, calls the backend API, or sets
  up QueryClientProvider. Also triggers if the user reports data
  inconsistency, duplicate network requests, or "the app forgets state
  when I navigate."
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

### 1. One QueryClient, created once, at the app root

`QueryClient` must be instantiated exactly once, outside the component tree (so it survives re-renders), and provided via a single `QueryClientProvider` at the top of the app.

```typescript
// frontend/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
```

```typescript
// frontend/src/App.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* rest of the app */}
    </QueryClientProvider>
  );
}
```

**Never** write `new QueryClient()` inside a component body, a custom hook, or anywhere other than this one module-level instantiation. If you find `new QueryClient()` anywhere else in the codebase, that's a bug — consolidate it to import the shared instance instead.

### 2. One API client, same pattern

Same rule for the HTTP client used to talk to the backend — a single configured instance, imported everywhere, not re-created per component or per call:

```typescript
// frontend/src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
```

All components/hooks import `apiFetch` from this one file. No component should call `fetch()` directly against the backend — see the `api-client-usage` convention if that skill exists in this project.

### 3. Consistent query keys — so cache is actually shared

For the shared QueryClient to actually prevent duplicate requests and preserve state across navigation, query keys must be consistent and centralized, not invented ad hoc per component:

```typescript
// frontend/src/api/queryKeys.ts
export const queryKeys = {
  forecast: (horizon: number) => ["forecast", horizon] as const,
  calibration: () => ["calibration"] as const,
};
```

```typescript
// usage in a component
const { data } = useQuery({
  queryKey: queryKeys.forecast(48),
  queryFn: () => apiFetch<ForecastResponse>(`/api/forecast?horizon=48`),
});
```

If two components need the same data (e.g. both the chart and the explanation panel need the forecast), they use the exact same `queryKeys.forecast(48)` key — React Query will dedupe the request and share the cached result automatically. Never construct the key inline differently in different places (e.g. `["forecast", 48]` in one file and `["forecast-data", 48]` in another) — that silently breaks sharing.

### 4. Before adding a new data-fetching component

Check first: does a query for this data already exist elsewhere in the app? If yes, reuse the same `queryKey` and let React Query's cache do the work — don't write a parallel fetch.

## Constraints

- Never instantiate `new QueryClient()` outside the single root module
- Never call `fetch()` directly in a component — always go through the shared `apiFetch` client
- Never invent a new ad hoc query key format — always use the centralized `queryKeys` object
- Never duplicate a query that already exists elsewhere for the same data