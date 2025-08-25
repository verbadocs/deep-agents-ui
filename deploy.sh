#!/bin/bash

# Deep Agents UI Deployment Script
echo "🚀 Building and deploying Deep Agents UI..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t deep-agents-ui .

# Stop any existing container
echo "🛑 Stopping existing container..."
docker stop deep-agents-ui 2>/dev/null || true
docker rm deep-agents-ui 2>/dev/null || true

# Run the new container
echo "▶️  Starting Deep Agents UI..."
docker run -d \
  --name deep-agents-ui \
  -p 3000:3000 \
  -e NEXT_PUBLIC_DEPLOYMENT_URL=${NEXT_PUBLIC_DEPLOYMENT_URL:-http://localhost:2024} \
  -e NEXT_PUBLIC_AGENT_ID=${NEXT_PUBLIC_AGENT_ID:-deepagent} \
  --restart unless-stopped \
  deep-agents-ui

echo "✅ Deep Agents UI is running at http://localhost:3000"
echo "🔧 To view logs: docker logs -f deep-agents-ui"
echo "🛑 To stop: docker stop deep-agents-ui"
