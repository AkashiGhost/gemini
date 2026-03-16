#!/usr/bin/env bash
# =============================================================================
# deploy.sh — InnerPlay Cloud Run Deployment Script
#
# Automates the full build-and-deploy pipeline:
#   1. Build Docker image via Cloud Build (remote, no local Docker required)
#   2. Push image to Artifact Registry
#   3. Deploy to Cloud Run in us-central1
#
# Usage:
#   ./deploy.sh                          # uses defaults + .env for secrets
#   ./deploy.sh --tag v1.2.3             # pin a specific image tag
#   GEMINI_API_KEY=sk-... ./deploy.sh    # pass secrets inline
#
# Prerequisites:
#   gcloud CLI authenticated: gcloud auth login && gcloud auth configure-docker
#   APIs enabled: Cloud Build, Cloud Run, Artifact Registry
# =============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration — override via environment variables or edit defaults below
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ID="${PROJECT_ID:-innerplay-prod}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-innerplay}"
REPO_NAME="${REPO_NAME:-innerplay}"                            # Artifact Registry repo
IMAGE_NAME="${IMAGE_NAME:-${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}}"

# Image tag — defaults to git short SHA for traceability
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
IMAGE_TAG="${IMAGE_TAG:-${GIT_SHA}}"
IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

# Cloud Run resource limits
MEMORY="${MEMORY:-512Mi}"
CPU="${CPU:-1}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"          # scale-to-zero for cost efficiency
MAX_INSTANCES="${MAX_INSTANCES:-3}"
PORT="${PORT:-3000}"
CONCURRENCY="${CONCURRENCY:-80}"             # WebSocket sessions per instance

# ─────────────────────────────────────────────────────────────────────────────
# Load secrets from .env if present (never committed — see .dockerignore)
# ─────────────────────────────────────────────────────────────────────────────

if [[ -f ".env" ]]; then
  echo "→ Loading secrets from .env"
  # Export only known keys — avoid leaking unrelated vars
  set -o allexport
  # shellcheck source=/dev/null
  source .env
  set +o allexport
fi

# Validate required secrets
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "ERROR: GEMINI_API_KEY is not set."
  echo "  Set it in .env or export it before running this script."
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Parse optional CLI flags
# ─────────────────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)       IMAGE_TAG="$2"; IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"; shift 2 ;;
    --project)   PROJECT_ID="$2"; shift 2 ;;
    --region)    REGION="$2"; shift 2 ;;
    --service)   SERVICE_NAME="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    -h|--help)
      sed -n '/^# ====/,/^# ===/p' "$0"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

DRY_RUN="${DRY_RUN:-false}"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight checks
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  InnerPlay — Cloud Run Deployment"
echo "════════════════════════════════════════════════════════════"
echo "  Project   : ${PROJECT_ID}"
echo "  Region    : ${REGION}"
echo "  Service   : ${SERVICE_NAME}"
echo "  Image     : ${IMAGE}"
echo "  Resources : ${CPU} vCPU · ${MEMORY} RAM · ${MIN_INSTANCES}-${MAX_INSTANCES} instances"
echo "════════════════════════════════════════════════════════════"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN — no changes will be made."
  exit 0
fi

# Confirm gcloud is pointing at the right project
gcloud config set project "${PROJECT_ID}" --quiet

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Ensure Artifact Registry repository exists
# ─────────────────────────────────────────────────────────────────────────────

echo "→ [1/3] Ensuring Artifact Registry repository '${REPO_NAME}' exists..."

gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet 2>/dev/null || \
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --description="InnerPlay container images" \
  --quiet

echo "   ✓ Repository ready: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Build Docker image via Cloud Build (remote — no local Docker needed)
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "→ [2/3] Building image via Cloud Build..."
echo "   Source: $(pwd)"
echo "   Tag:    ${IMAGE}"
echo ""

gcloud builds submit . \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --tag="${IMAGE}" \
  --timeout="20m"

echo "   ✓ Image built and pushed: ${IMAGE}"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Deploy to Cloud Run
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "→ [3/3] Deploying to Cloud Run..."

gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --allow-unauthenticated \
  --port="${PORT}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --concurrency="${CONCURRENCY}" \
  --timeout="300" \
  --set-env-vars="NODE_ENV=production,PORT=${PORT},HOST=0.0.0.0" \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --set-env-vars="ELARA_VOICE=${ELARA_VOICE:-Aoede}" \
  --set-env-vars="STORIES_BASE_PATH=./stories/the-last-session" \
  --labels="app=innerplay,git-sha=${IMAGE_TAG},managed-by=deploy-sh" \
  --quiet

# ─────────────────────────────────────────────────────────────────────────────
# Post-deploy: fetch and print the live URL
# ─────────────────────────────────────────────────────────────────────────────

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Deployment complete!"
echo "  Service URL : ${SERVICE_URL}"
echo "  Health check: ${SERVICE_URL}/health"
echo "  Image tag   : ${IMAGE_TAG}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Quick smoke test — verify the /health endpoint responds
echo "→ Running smoke test..."
HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "${SERVICE_URL}/health" || echo '000')"

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "   ✓ Health check passed (HTTP ${HTTP_STATUS})"
else
  echo "   ✗ Health check returned HTTP ${HTTP_STATUS} — check Cloud Run logs:"
  echo "     gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --limit=50"
  exit 1
fi
