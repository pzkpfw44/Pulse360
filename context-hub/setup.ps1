# Stop any running containers
docker-compose down

# Create a new Dockerfile.custom based on the existing one
$dockerfileContent = @"
# Use Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN apt-get update && apt-get install -y `
    build-essential `
    libpq-dev `
    && apt-get clean `
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Install shared package (this is the key line)
RUN pip install -e /shared

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"@

Set-Content -Path .\backend\Dockerfile.custom -Value $dockerfileContent

# Update docker-compose.yml to use the new Dockerfile
(Get-Content .\docker-compose.yml) -replace 'Dockerfile', 'Dockerfile.custom' | Set-Content .\docker-compose.yml

# Create initial database script
$dbInitContent = @"
CREATE DATABASE context_hub;
GRANT ALL PRIVILEGES ON DATABASE context_hub TO pulse360;
"@

Set-Content -Path .\init-db.sql -Value $dbInitContent

Write-Host "Setup complete. Now run: docker-compose up"