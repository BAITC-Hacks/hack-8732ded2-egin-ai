# Repository Guidelines

## Project Structure & Module Organization

This repository contains two independent TypeScript applications:

- `frontend/` — React + Vite client. Application code is under `frontend/src/`; reusable UI components live in `src/components/ui/`, shared helpers in `src/lib/`, and styling in `src/index.css`.
- `backend/` — Express.js API. Server entrypoint and routes currently live in `backend/src/index.ts`.
- `frontend/components.json` — shadcn/ui configuration.
- `backend/.env.example` — documented backend environment variables.

Tests and static assets are not currently present. Add tests next to the relevant application when introducing them.

## Build, Test, and Development Commands

Run each application from its own directory:

```bash
cd frontend && npm install && npm run dev
cd backend && npm install && copy .env.example .env && npm run dev
```

- `npm run dev` starts the Vite client on port 5173 or the Express API on port 3000.
- `npm run build` creates a production build (`frontend/dist` or `backend/dist`).
- `npm run start` in `backend` runs the compiled API.
- No test script is configured yet; add one to the relevant `package.json` when introducing a test framework.

## Coding Style & Naming Conventions

Use TypeScript with strict checking enabled. Use two-space indentation, semicolons, and double quotes, matching the existing files. Name React components and component files in PascalCase when they represent components; use camelCase for helpers, hooks, and variables. Keep shared frontend utilities in `src/lib` and reusable shadcn-style components in `src/components/ui`.

## Testing Guidelines

There is currently no testing framework or coverage threshold. New API behavior should include endpoint tests, and new UI behavior should include component tests once a framework is added. Keep test names descriptive and colocate them with the code or in an application-level `tests/` directory.

## Commit & Pull Request Guidelines

The Git history currently contains only `Initial commit`, so no established commit convention exists. Use concise imperative messages, preferably scoped by application, such as `frontend: add login form` or `backend: add health route`. Pull requests should describe the change, mention configuration or API changes, include verification commands, and attach screenshots for visible frontend changes.

## Security & Configuration

Do not commit `.env` files, credentials, or tokens. Update `.env.example` when adding required configuration. Keep the frontend API URL configurable through `VITE_API_URL`; keep backend port and CORS origin configurable through `PORT` and `FRONTEND_URL`.

## Repository

The canonical remote is `https://github.com/BAITC-Hacks/hack-8732ded2-egin-ai.git`.
