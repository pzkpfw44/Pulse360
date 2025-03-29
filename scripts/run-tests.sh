#!/bin/bash
# Run tests for all modules

# Exit on error
set -e

# Run shared tests
echo "Running shared tests..."
docker-compose run --rm shared bash -c "cd /app && pytest"

# Check if context-hub exists and has tests
if [ -d "context-hub" ]; then
  echo "Running context-hub tests..."
  docker-compose run --rm context-hub-api bash -c "cd /app && pytest"
fi

# Check if control-hub exists and has tests
if [ -d "control-hub" ]; then
  echo "Running control-hub tests..."
  docker-compose run --rm control-hub-api bash -c "cd /app && pytest"
fi

# Check if feedback-hub exists and has tests
if [ -d "feedback-hub" ]; then
  echo "Running feedback-hub tests..."
  docker-compose run --rm feedback-hub-api bash -c "cd /app && pytest"
fi

# Check if integration exists and has tests
if [ -d "integration" ]; then
  echo "Running integration tests..."
  docker-compose run --rm api-gateway bash -c "cd /app && pytest"
fi

echo "All tests completed!"