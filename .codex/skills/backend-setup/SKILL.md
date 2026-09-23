---
name: backend-setup
description: |
  Enforces correct CORS configuration and environment variable handling for
  the Node.js/Express backend. Triggers when Codex creates or edits
  server.js/app.js entry points, adds new routes that will be called from
  the frontend, adds any new environment variable (API keys, base URLs,
  ports), or when the user asks to "set up CORS", "configure env",
  "add an API key", or reports a CORS/env-related error in the browser
  console or server logs.
metadata:
  author: egin-ai
  project: windcast-agent
  version: "1.0"
---

## Instructions

### 1. CORS — configure explicitly, never wildcard blindly

Do not use `app.use(cors())` with no options as the final setup — it's fine for a first quick local test, but before the task is considered done, lock it down:

```typescript
import cors from "cors";

const allowedOrigins = [
  "http://localhost:5173",      // Vite dev server default
  process.env.FRONTEND_URL,      // deployed frontend URL, from env
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: false, // set true only if the project actually uses cookies/auth sessions
}));
```

- If the frontend dev server runs on a non-default port (check `frontend/vite.config.ts` or `package.json` dev script), match it exactly — do not guess.
- If a request fails with a CORS error, first check: (a) is the origin in `allowedOrigins`, (b) is the backend actually running on the port the frontend expects, (c) is the request method allowed. Report the specific cause, don't just wrap everything in a permissive wildcard to make the error disappear.

### 2. Environment variables — always via `.env`, never hardcoded

- Every secret or environment-dependent value (API keys, base URLs, ports) goes in `.env`, loaded via `dotenv`:
  ```typescript
  import "dotenv/config";
  const PORT = process.env.PORT ?? 3000;
  ```
- Never write an API key, URL, or credential directly in source code, even "temporarily for testing."

### 3. Maintain `.env.example` in sync

Every time a new environment variable is introduced, add it to `.env.example` (committed to git) with a placeholder value and a one-line comment — but NEVER put the real value there:

```bash
# .env.example
OPENAI_API_KEY=sk-...your-key-here
NVIDIA_API_KEY=nvapi-...your-key-here
FRONTEND_URL=http://localhost:5173
PORT=3000
```

If `.env.example` doesn't exist yet, create it as part of the same task that introduces the first environment variable.

### 4. Validate required env vars at startup

Fail fast and loudly if a required variable is missing, instead of letting the app crash later mid-request with a confusing error:

```typescript
const requiredEnvVars = ["OPENAI_API_KEY", "PORT"] as const;
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

### 5. `.gitignore` check

Before finishing any task that touches env setup, confirm `.env` (the real file, not `.env.example`) is listed in `.gitignore`:
```bash
grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
```

### 6. Ports and local dev

- Backend default port and frontend dev server port must not collide. Document both clearly (in `.env.example` and/or `AGENTS.md`), don't leave the developer to guess.
- If deploying (Vercel for frontend, Railway/Render for backend, as per project setup), make sure the deployed `FRONTEND_URL`/`BACKEND_URL` env vars are set on the hosting platform, not just locally — flag this explicitly to the user as a manual step they need to do in the hosting dashboard.

## Constraints

- Never hardcode API keys, URLs, or ports in source files
- Never leave CORS fully open (`origin: "*"`) as the final state — only as a temporary debug step, and say so explicitly if you do it
- Never add an env variable without also adding it to `.env.example`
- Never let `.env` end up tracked by git