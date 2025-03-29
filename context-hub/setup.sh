#!/bin/bash
# Fix shared module import and database

# Stop any running containers
docker-compose down

# Create a new Dockerfile.custom based on the existing one
cat > backend/Dockerfile.custom << EOF
# Use Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    libpq-dev \\
    && apt-get clean \\
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
EOF

# Update docker-compose.yml to use the new Dockerfile
sed -i 's/Dockerfile/Dockerfile.custom/g' docker-compose.yml

# Create initial database
cat > init-db.sql << EOF
CREATE DATABASE context_hub;
GRANT ALL PRIVILEGES ON DATABASE context_hub TO pulse360;
EOF

# Update docker-compose.yml to initialize the database
sed -i '/context-hub-network/a\\
  volumes:\
    - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro' docker-compose.yml

echo "Setup complete. Now run: docker-compose up"