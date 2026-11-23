#!/usr/bin/env bash
# Build the app image for amd64 + arm64 (Raspberry Pi) and push it to GitHub Container Registry.
#
# One-time setup:
#   1. Create a GitHub personal access token (classic) with the `write:packages` scope.
#   2. echo "$GHCR_TOKEN" | docker login ghcr.io -u <your-github-username> --password-stdin
#
# Usage:  pnpm image:push            # tags :<git-sha> and :latest
#         pnpm image:push v1.2.0     # tags :v1.2.0 and :latest
#         PLATFORMS=linux/arm64 pnpm image:push   # Pi only (faster)
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/tomroffe/mini-coaching}"
TAG="${1:-$(git rev-parse --short HEAD)}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER=minis-builder

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes; they will be baked into $IMAGE:$TAG." >&2
fi

# Multi-platform builds need a docker-container builder (created once, reused after)
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDER" --driver docker-container >/dev/null
fi

echo "Building $IMAGE:$TAG for $PLATFORMS …"
docker buildx build \
  --builder "$BUILDER" \
  --platform "$PLATFORMS" \
  --tag "$IMAGE:$TAG" \
  --tag "$IMAGE:latest" \
  --push \
  .

echo "✅ Pushed $IMAGE:$TAG and $IMAGE:latest"
