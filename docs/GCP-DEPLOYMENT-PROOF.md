# GCP Deployment Proof

This document records the current Google Cloud Run deployment state for
InnerPlay and the commands used to verify it.

## Deployment Target

- Project ID: `innerplay-488718`
- Project Number: `443171020325`
- Region: `us-central1`
- Cloud Run service: `innerplay-gemini`

## Verified Service State

Verified on March 15, 2026 from the local workspace with `gcloud`.

- Latest ready revision: `innerplay-gemini-00068-q6m`
- Public Cloud Run URL: `https://innerplay-gemini-443171020325.us-central1.run.app`
- Alternate service URL: `https://innerplay-gemini-zet5yjbw2q-uc.a.run.app`

## Verification Commands

Describe the active Cloud Run service:

```bash
gcloud run services describe innerplay-gemini \
  --region us-central1 \
  --project innerplay-488718 \
  --format=json
```

List the matching project:

```bash
gcloud projects list --format="value(projectId,projectNumber,name)"
```

Deploy a new revision from source:

```bash
gcloud run deploy innerplay-gemini \
  --source . \
  --region us-central1 \
  --project innerplay-488718 \
  --allow-unauthenticated
```

## Submission Guidance

For Devpost, this document is supporting evidence only. The stronger artifact is
a short separate recording that shows:

1. the Cloud Run service page
2. the current revision
3. the public URL
4. a successful `/api/health` check

That recording should stay separate from the main demo video.

