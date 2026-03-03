# Sound + Quality CLI Checks

Fast local verification for sound constraints and quality checklist integrity.

## Scope

These checks validate:

- story YAML loads through `loadStory(...)`
- quality checklist entries are present and mapped
- critical sound-design constraint stays enforced (`clock_stop` hard stop)
- TTS ducking config exists for narration clarity

## Commands (from repo root)

```bash
npx tsx scripts/check-sound-quality.ts
```

Expected:

- exits `0`
- prints `All 4 checks passed.`

Targeted test:

```bash
npx vitest run tests/unit/sound-quality-checks.test.ts
```

Targeted lint:

```bash
npx eslint src/lib/story-loader.ts scripts/check-sound-quality.ts tests/unit/sound-quality-checks.test.ts
```

## If it fails

- `quality-checklist-loaded` fails: inspect `stories/the-last-session/evaluation/quality-checklist.yaml` structure.
- `clock-stop-hard-fade` fails: inspect `stories/the-last-session/sounds/cue-map.yaml` (`transitions.clock_stop.fade_duration_seconds` must be `0`).
- `tts-ducking-configured` fails: inspect `stories/the-last-session/sounds/cue-map.yaml` under `mixing.tts_ducking`.

## Related verification

For tool-call parsing and deterministic phase assertions, run:

```bash
npx tsx scripts/closed-loop-scenario.ts
```
