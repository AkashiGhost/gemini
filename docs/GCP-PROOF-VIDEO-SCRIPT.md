# GCP Proof Video Script

Record this as a separate clip from the main demo.

## Target

- Length: `30-60 seconds`
- Purpose: prove the shipped product is deployed on Google Cloud Run
- Format: screen recording only is fine

## What Must Be Visible

1. Google Cloud Run service page
2. Service name: `innerplay-gemini`
3. Region: `us-central1`
4. Current revision
5. Public service URL
6. Successful health check

## Recording Order

### Shot 1: Cloud Run service page

Open the Cloud Run service in Google Cloud Console and show:

- project: `innerplay-488718`
- service: `innerplay-gemini`
- region: `us-central1`
- latest ready revision

Voiceover:

> "InnerPlay is deployed on Google Cloud Run in project innerplay-488718, service innerplay-gemini, region us-central1."

### Shot 2: Revision and public URL

Hold long enough for the viewer to read:

- current ready revision
- public URL

Voiceover:

> "This is the active public revision and the live service URL used by the product."

### Shot 3: Health check

Open the public health endpoint:

```text
https://innerplay-gemini-443171020325.us-central1.run.app/api/health
```

Show the successful response.

Voiceover:

> "The deployed service responds successfully on the public health endpoint."

### Shot 4: Optional live app check

Open:

```text
https://innerplay-gemini-443171020325.us-central1.run.app/play?story=the-call&debugText=1
```

Only keep this if it loads cleanly within a few seconds.

Voiceover:

> "And this is the deployed application loading from that same Cloud Run service."

## Exact On-Screen Checklist

- Google Cloud branding visible
- Cloud Run visible
- Service name visible
- Revision visible
- Public URL visible
- Health endpoint success visible

## Keep It Clean

- Do not show unrelated browser tabs
- Do not show secrets
- Do not show terminal history unless needed
- Do not include local dev URLs
- Do not mix this clip into the main product demo
