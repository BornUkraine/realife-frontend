#!/usr/bin/env sh
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Starting Next.js..."
npx next start -p "${PORT:-3000}" &
PID=$!

term_handler() {
  echo "Received SIGTERM, shutting down gracefully..."
  kill -TERM "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
  exit 0
}

trap term_handler TERM INT

wait "$PID"