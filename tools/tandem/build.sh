#!/bin/bash
# Build the tandem Docker image. The Dockerfile is multi-stage, so the Go binary is
# compiled inside the image — no host Go toolchain needed, just Docker.
#
#   ./build.sh              build the image locally (host arch)  -> tag "tandem"
#   ./build.sh push         build+push multi-arch to the registry (needs login)
set -e
cd "$(dirname "$0")"

IMAGE="${TANDEM_IMAGE:-ghcr.io/denoland/tandem}"

if [ "$1" = "push" ]; then
  echo "building + pushing multi-arch $IMAGE:latest …"
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "$IMAGE:latest" \
    --push .
  echo "pushed $IMAGE:latest"
else
  echo "docker build (host arch) -> tandem …"
  docker build -t tandem .
  echo
  echo "done. Add to Claude:"
  echo "  claude mcp add tandem -- docker run --rm -i -e TANDEM_VOICE=realtime -e OPENAI_API_KEY=sk-... tandem"
fi
