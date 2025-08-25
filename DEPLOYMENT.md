# Deep Agents UI - Deployment Guide

## Quick Start (Docker - Recommended)

### Prerequisites

- Docker installed on your system
- Your backend server running (the one this UI connects to)

### Option 1: Using the deployment script

```bash
# Make the script executable
chmod +x deploy.sh

# Set your backend URL (replace with your actual backend URL)
export NEXT_PUBLIC_DEPLOYMENT_URL=http://your-backend-server:2024

# Run the deployment
./deploy.sh
```

### Option 2: Using Docker Compose

```bash
# Edit docker-compose.yml to set your backend URL
# Then run:
docker-compose up -d
```

### Option 3: Manual Docker commands

```bash
# Build the image
docker build -t deep-agents-ui .

# Run the container
docker run -d \
  --name deep-agents-ui \
  -p 3000:3000 \
  -e NEXT_PUBLIC_DEPLOYMENT_URL=http://your-backend-server:2024 \
  -e NEXT_PUBLIC_AGENT_ID=deepagent \
  deep-agents-ui
```

## Access the Application

Once running, open your browser and go to: **http://localhost:3000**

## Management Commands

```bash
# View logs
docker logs -f deep-agents-ui

# Stop the application
docker stop deep-agents-ui

# Start the application
docker start deep-agents-ui

# Remove the container
docker rm deep-agents-ui

# Update to a new version
docker pull deep-agents-ui
./deploy.sh
```

## Environment Variables

- `NEXT_PUBLIC_DEPLOYMENT_URL`: Your backend server URL (required)
- `NEXT_PUBLIC_AGENT_ID`: Agent ID (defaults to "deepagent")

## Troubleshooting

- If the app doesn't load, check that your backend server is running
- Check logs: `docker logs deep-agents-ui`
- Ensure port 3000 is available on your system
