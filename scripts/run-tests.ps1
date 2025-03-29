# Run tests for all modules

# Run shared tests
Write-Host "Running shared tests..."
docker-compose run --rm shared bash -c "cd /app && pytest"

# Check if context-hub exists and has tests
if (Test-Path "context-hub") {
    Write-Host "Running context-hub tests..."
    docker-compose run --rm context-hub-api bash -c "cd /app && pytest"
}

# Check if control-hub exists and has tests
if (Test-Path "control-hub") {
    Write-Host "Running control-hub tests..."
    docker-compose run --rm control-hub-api bash -c "cd /app && pytest"
}

# Check if feedback-hub exists and has tests
if (Test-Path "feedback-hub") {
    Write-Host "Running feedback-hub tests..."
    docker-compose run --rm feedback-hub-api bash -c "cd /app && pytest"
}

# Check if integration exists and has tests
if (Test-Path "integration") {
    Write-Host "Running integration tests..."
    docker-compose run --rm api-gateway bash -c "cd /app && pytest"
}

Write-Host "All tests completed!"