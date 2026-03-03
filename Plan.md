# Plan.md

This file is the default milestone controller for agent work in this repository.

## Rules

1. Review-first: read target code, existing tests, and constraints before editing.
2. Stop-and-fix: after each milestone, run its validation command. If it fails, stop and repair before moving on.
3. Close-the-loop: for end-to-end validation, run `npm run verify:loop`.

## Milestones

| Milestone | Scope | Validation Command | Status | Notes |
|---|---|---|---|---|
| M1 | Creator model/runtime compatibility | `npm run lint:creator && npm run test:creator:contract` | done | Updated Gemini/Imagen model IDs and removed unsupported image parameter. |
| M2 | UI headless E2E reliability | `npm run test:e2e:ui` | done | E2E assertions now outcome-based and CLI-friendly. |
| M3 | Unified loop orchestration | `npm run verify:loop` | done | Added auto-orchestrated loop runner with health checks and strict fail-fast behavior. |

## Usage

When starting a new task:
1. Add a new milestone row.
2. Define one concrete validation command.
3. Mark `done` only after command exits `0`.
