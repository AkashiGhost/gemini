# InnerPlay

InnerPlay is a voice-first interactive storytelling game built for the Gemini
Live Agent Challenge. The player speaks with a live AI character, hears
story-specific sound design in the browser, and can also create new stories
through a Gemini-powered creator flow.

## Stack

- Next.js 16
- React 19
- TypeScript
- Google GenAI SDK: `@google/genai`
- Gemini Live Native Audio
- Gemini 2.5 Flash
- Imagen 4
- Google Cloud Run
- Web Audio API

## Core Features

- Real-time Gemini Live voice sessions for playable stories
- Story-specific audio direction and spatial sound cues in-browser
- Creator interview flow that generates and publishes new story packs
- Google Cloud deployment on Cloud Run

## Repository Structure

- `src/app/` App routes and API routes
- `src/context/` live game session state
- `src/hooks/` audio and runtime hooks
- `src/lib/` story runtime, audio engine, creator pipeline, shared utilities
- `stories/` authored story assets and YAML content
- `schemas/` validation schemas
- `tests/` unit and contract coverage
- `scripts/` deterministic verifiers and closed-loop checks
- `docs/` architecture, submission, demo, and investigation notes

## Prerequisites

- Node.js 22+
- npm 10+
- A Google AI API key with access to Gemini Live and Gemini 2.5 Flash
- Optional: Google Cloud SDK for Cloud Run deploys

## Environment Variables

Create `.env.local` with:

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

Install dependencies:

```bash
npm ci
```

Run the app locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

Build the app:

```bash
npm run build
```

Start the production server locally:

```bash
npm run start
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Verification

Run the targeted the-call audio verification:

```bash
npm run test:the-call:audio
```

Run unit tests:

```bash
npm test
```

Run the closed-loop tool-call scenario:

```bash
npx tsx scripts/closed-loop-scenario.ts
```

## Cloud Run Deployment

Manual source deploy:

```bash
gcloud run deploy innerplay-gemini ^
  --source . ^
  --region us-central1 ^
  --project innerplay-488718 ^
  --allow-unauthenticated
```

After deploy:

```bash
gcloud run services describe innerplay-gemini ^
  --region us-central1 ^
  --project innerplay-488718
```

## Submission-Oriented Docs

- [Devpost submission draft](C:\Users\akash\Desktop\AI_projects\InnerPlay\hackathons\gemini\docs\DEVPOST-SUBMISSION.md)
- [Submission checklist](C:\Users\akash\Desktop\AI_projects\InnerPlay\hackathons\gemini\docs\SUBMISSION-CHECKLIST.md)
- [Architecture diagram source notes](C:\Users\akash\Desktop\AI_projects\InnerPlay\hackathons\gemini\docs\ARCHITECTURE-DIAGRAM.md)
- [Submission readiness status](C:\Users\akash\Desktop\AI_projects\InnerPlay\hackathons\gemini\docs\SUBMISSION-READINESS.md)
- [Cloud Run deployment proof notes](C:\Users\akash\Desktop\AI_projects\InnerPlay\hackathons\gemini\docs\GCP-DEPLOYMENT-PROOF.md)

## Deployed URLs

- Production domain: `https://innerplay.app`
- Cloud Run service URL: `https://innerplay-gemini-443171020325.us-central1.run.app`

