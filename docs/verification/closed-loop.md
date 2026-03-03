# Closed-Loop Scenario Runner (CLI)

Deterministic verification script for live tool-call parsing and phase outcome checks.

## Run

```bash
npx tsx scripts/closed-loop-scenario.ts
```

## What it verifies

- `trigger_sound` parsing with snake_case and camelCase argument variants
- `set_tension` parsing + normalization and expected phase outcome
- explicit phase override behavior for `set_tension`
- `end_game` parsing
- rejection/ignore behavior for invalid tool calls

## Exit behavior

- `0`: all scenarios passed
- non-zero: one or more failures

When failures occur, the script prints per-case diagnostics with expected vs actual values, then a summary count of scenarios, assertions, passed, and failed.
