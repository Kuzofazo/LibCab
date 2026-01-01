Title: Turbopack panic on Windows: "Access is denied. (os error 5)"

Environment:
- OS: Windows (local dev)
- Node: (machine-specific; recommended 20.11.1; see .nvmrc)
- PNPM: 9.x
- Initial Next.js version where panic occurred: 16.1.1 (Turbopack enabled)

Reproduction steps:
1. From repo root, run: `npm run dev` (or `pnpm --filter web dev`) on Windows without elevated privileges.
2. Observe Next startup and then a Turbopack panic that writes a log to %TEMP% (e.g., `next-panic-*.log`).

Observed behavior:
- Turbopack writes panic log with message: `Access is denied. (os error 5)`.
- When starting as Administrator, the panic does not occur; server starts but may print a benign I/O benchmark warning.
- Disabling Controlled Folder Access did not change behavior in our tests.

Files attached:
- `web/next-panic.log` (copied from %TEMP%) — contains: `Access is denied. (os error 5)`.

Notes & recommendations:
- This appears to be a Windows-specific issue with Turbopack accessing a path or resource. Safe mitigations:
  - Use PNPM + Node 20.11.x and Next 15.x (no Turbopack) for a stable Windows dev experience.
  - If using Next 16/Turbopack, run dev server elevated or use a non-synced local folder as a workaround.

Please include any additional logs or context if needed.  

(Prepared by LibCab maintainer tooling run.)
