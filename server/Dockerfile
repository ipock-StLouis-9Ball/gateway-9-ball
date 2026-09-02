# Gateway 9-Ball resolver — Dockerfile (Google Cloud Run)
#
# Build context = the nine-ball-mvp project root (so it can COPY both js/ and
# server/). From that root:  docker build -f server/Dockerfile -t gateway-9-ball .
#
# Cloud Run deploys from source automatically when you point it at this folder;
# see server/README.md for the gcloud commands.

FROM node:20-slim

WORKDIR /app/server

# Install dependencies first (cached layer).
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# Shared deterministic physics + rules (the authority).
COPY js/ /app/js/
# Server source.
COPY server/ ./

ENV PORT=8787
EXPOSE 8787

# tsx runs the TypeScript directly (no separate build step).
CMD ["npx", "tsx", "src/index.ts"]
