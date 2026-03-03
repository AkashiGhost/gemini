# Creator Pipeline Debugging (CLI + Trace ID)

This runbook is for fast end-to-end debugging of:
- `POST /api/creator/interview`
- `POST /api/creator/image`
- `POST /api/creator/story-pack`

All three endpoints now accept/return `x-trace-id`, and include that trace in structured server logs.

## 1) Start server with logs

PowerShell:

```powershell
$env:GEMINI_API_KEY="your-key"
npm run dev 2>&1 | Tee-Object -FilePath .\creator-debug.log
```

Use a single trace ID for one investigation:

```powershell
$TRACE_ID="creator-debug-001"
```

## 2) Interview (SSE)

Use `curl.exe` (not PowerShell `curl` alias) and include `-D` to inspect response headers.

```powershell
curl.exe -sS -N `
  -D - `
  -H "Content-Type: application/json" `
  -H "x-trace-id: $TRACE_ID" `
  -X POST http://localhost:3000/api/creator/interview `
  --data-raw "{\"sessionId\":\"cli-session-1\",\"messages\":[{\"role\":\"user\",\"content\":\"Dark sci-fi corridor concept art.\"}],\"currentSpec\":{}}"
```

Expected:
- response header includes `x-trace-id: creator-debug-001`
- SSE stream includes `event: message`, `event: spec_update` (optional), `event: image_prompt`, `event: complete`

## 3) Image

```powershell
curl.exe -sS `
  -D - `
  -H "Content-Type: application/json" `
  -H "x-trace-id: $TRACE_ID" `
  -X POST http://localhost:3000/api/creator/image `
  --data-raw "{\"sessionId\":\"cli-session-1\",\"prompt\":\"Cinematic dark corridor, wet floor reflections, emergency lights\",\"spec\":{\"aspectRatio\":\"16:9\"}}"
```

Expected:
- response header includes `x-trace-id: creator-debug-001`
- JSON has `imageBase64`, `mimeType`, `prompt`, `model`
- if rate-limited: HTTP `429`, `Retry-After`, and same `x-trace-id`

## 4) Story Pack

```powershell
curl.exe -sS `
  -D - `
  -H "Content-Type: application/json" `
  -H "x-trace-id: $TRACE_ID" `
  -X POST http://localhost:3000/api/creator/story-pack `
  --data-raw "{\"sessionId\":\"cli-session-1\",\"spec\":{\"title\":\"The Last Relay\",\"theme\":\"signal loss\",\"mood\":\"tense\"},\"draftText\":\"A stranded operator receives impossible transmissions.\"}"
```

Expected:
- response header includes `x-trace-id: creator-debug-001`
- JSON has `storyPack` with `title`, `logline`, `playerRole`, `openingLine`, `phaseOutline`, `soundPlan`, `systemPromptDraft`

## 5) Filter logs by trace

```powershell
Get-Content .\creator-debug.log | Select-String $TRACE_ID
```

You should see creator API events with matching `traceId` and causal chain entries like `trace:creator-debug-001`.

## 6) Fast verification commands

```powershell
npm run lint:creator
npm run test:creator:contract
```

