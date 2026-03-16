# InnerPlay

**The first game designed to be played with your eyes closed.**

InnerPlay is a voice-only AI storytelling game built for the Gemini Live Agent Challenge 2026. Players close their eyes, put on headphones, and speak with a live AI character through Gemini 2.5 Flash Native Audio. The story adapts in real time based on their voice choices. A separate creator pipeline lets anyone build and publish new story packs through a Gemini-powered interview flow.

**Live:** https://innerplay-gemini-443171020325.us-central1.run.app

---

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Google GenAI SDK** (`@google/genai`) — Gemini Live Native Audio, Gemini 2.5 Flash, Imagen 4
- **Google Cloud Run** — WebSocket-capable backend hosting
- **Web Audio API** — three-layer in-browser spatial audio (voice + ambient + score)

## Core Features

- Real-time Gemini Live bidirectional voice sessions (no turn-taking, natural barge-in)
- State-director audio engine: footsteps, ambience, tension layers triggered by narrative state
- Creator interview pipeline: describe a story premise, Gemini generates a complete story pack
- Eyes-closed, voice-only UX — no screen required to play

## Repository Structure

```
src/app/          App routes and API routes (Next.js App Router)
src/context/      Live game session state (Gemini session lifecycle)
src/hooks/        Audio and runtime hooks (useSoundEngine, useGameSession)
src/lib/          Story runtime, audio engine, creator pipeline, shared utilities
stories/          Authored story assets and YAML content
schemas/          Validation schemas
tests/            Unit and contract coverage
scripts/          Deterministic verifiers and closed-loop checks
docs/             Architecture, submission, demo, and investigation notes
```

## Prerequisites

- Node.js 22+
- npm 10+
- A Google AI API key with access to Gemini Live and Gemini 2.5 Flash
  → Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Optional: Google Cloud SDK (`gcloud`) for Cloud Run deploys

## Environment Variables

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_google_ai_api_key
```

Optional runtime variables:

```bash
ELARA_VOICE=Aoede
STORIES_BASE_PATH=./stories
SCHEMAS_BASE_PATH=./schemas
NEXT_PUBLIC_ENABLE_LYRIA_REALTIME=false
```

## Local Development

```bash
npm ci
npm run dev
```

Open: http://localhost:3000

## Production Build

```bash
npm run build
npm run start
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Verification

Run unit tests:

```bash
npm test
```

Run the closed-loop tool-call scenario (verifies `trigger_sound`, `set_tension`, `end_game` parsing):

```bash
npx tsx scripts/closed-loop-scenario.ts
```

Run targeted audio verification for "The Call":

```bash
npm run test:the-call:audio
```

## Cloud Run Deployment

The app is pre-configured for Cloud Run via `Dockerfile`. Deploy from source:

```bash
gcloud run deploy innerplay-gemini \
  --source . \
  --region us-central1 \
  --project innerplay-488718 \
  --allow-unauthenticated
```

Set the required secret before deploying:

```bash
gcloud run services update innerplay-gemini \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --region us-central1
```

Check service status:

```bash
gcloud run services describe innerplay-gemini \
  --region us-central1 \
  --project innerplay-488718
```

Live service: https://innerplay-gemini-443171020325.us-central1.run.app

## Docs

- [Architecture diagram](docs/ARCHITECTURE-DIAGRAM.md)
- [Devpost submission draft](docs/DEVPOST-SUBMISSION.md)
- [Submission checklist](docs/SUBMISSION-CHECKLIST.md)
- [GCP deployment proof notes](docs/GCP-DEPLOYMENT-PROOF.md)
