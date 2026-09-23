# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite-powered React 19 frontend written in TypeScript. Application entry points and global styles are in `src/main.tsx` and `src/index.css`. Reusable UI components live in `src/components/ui/` (including the shadcn-style `Button`), while shared helpers and the Axios client are in `src/lib/`. Configuration is kept at the repository root: Vite, TypeScript, Tailwind, and PostCSS configs. There is currently no dedicated test directory.

Use the `@/*` alias for imports from `src` (for example, `@/lib/api`) and keep new feature code organized by responsibility under `src/`.

## Build, Test, and Development Commands

Run these commands from this directory:

- `npm install` — install the locked dependency set from `package-lock.json`.
- `npm run dev` — start the Vite development server at `http://localhost:5173`.
- `npm run build` — run TypeScript project checks and create a production build in `dist/`.
- `npm run preview` — serve the production build locally for verification.

No test or lint script is configured yet. Before submitting changes, at minimum run `npm run build` and manually exercise affected UI and API flows.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, double quotes, and strict TypeScript. Prefer functional React components, named exports, and small focused modules. Name components in PascalCase (`UserCard.tsx`), functions and variables in camelCase, and constants in descriptive camelCase or UPPER_SNAKE_CASE where appropriate. Use Tailwind utility classes for styling and `cn()` when conditionally merging classes. Keep API configuration in `src/lib/api.ts`; read environment-specific values through `VITE_*` variables.

## Testing Guidelines

There is no test framework or coverage threshold configured. If adding substantial behavior, introduce colocated or `src/` tests with the chosen framework and add a corresponding npm script. Name tests after the unit or behavior they cover (for example, `button.test.tsx`).

## Commit & Pull Request Guidelines

The Git history currently contains only an initial commit, so no established message convention is visible. Use concise, imperative messages with a scoped prefix when useful, such as `feat(ui): add loading state` or `fix(api): handle timeout`. Pull requests should describe the user-visible change, list validation commands run, link related issues, and include screenshots or a short recording for visual changes.

## Security & Configuration Tips

Do not commit secrets. Configure the backend endpoint with `VITE_API_URL` in local environment files, and remember that Vite-exposed variables are public to the browser; never place credentials in them.
