# Repository Guidelines

## Project Structure & Module Organization

This directory contains the backend service for the project. Application code lives in `src/`; the current entry point is `src/index.ts`, which configures Express, CORS, JSON parsing, and the `/api/health` endpoint. TypeScript compiles to `dist/`, which is generated and should not be edited manually. Use `.env.example` as the template for local configuration. Dependencies and scripts are defined in `package.json`, with the lockfile committed for reproducible installs.

## Build, Test, and Development Commands

Run commands from this directory:

- `npm install` - install dependencies from `package-lock.json`.
- `npm run dev` - run the server with `tsx` watch mode for local development.
- `npm run build` - type-check and compile `src/` into `dist/`.
- `npm start` - run the compiled server from `dist/index.js`.

Copy `.env.example` to `.env` before running locally, then adjust `PORT` or `FRONTEND_URL` as needed. There is currently no test or lint script; add one to `package.json` when introducing a test suite or formatter.

## Coding Style & Naming Conventions

Use strict TypeScript settings already enabled in `tsconfig.json`. Prefer two-space indentation, semicolons, and single-quoted strings unless surrounding code establishes another convention. Use `camelCase` for variables and functions, `PascalCase` for classes or types, and lowercase hyphenated names for multi-word files (for example, `health-check.ts`). Keep route setup and application wiring easy to trace from `src/index.ts`; split feature-specific routes or services into focused modules as the codebase grows.

## Testing Guidelines

No test framework or coverage threshold is configured yet. For new endpoints or business logic, add tests with the chosen framework and expose a corresponding `npm test` script. Name tests after the behavior they verify (for example, `health.test.ts`) and ensure `npm run build` passes before submitting changes.

## Commit & Pull Request Guidelines

The repository currently has only an initial commit, so no established commit convention is visible. Use short, imperative messages such as `Add health endpoint` or `Fix CORS configuration`. Pull requests should explain the change, identify configuration or API effects, include validation commands and results, link related issues when applicable, and include screenshots only when a user-visible frontend behavior is involved.

## Security & Configuration

Do not commit `.env` files, credentials, or production secrets. Keep local configuration aligned with `.env.example`. Review CORS changes carefully, and validate environment-derived values before using them in new integrations.
