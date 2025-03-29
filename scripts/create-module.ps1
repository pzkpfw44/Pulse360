# Create a new module
param(
    [Parameter(Mandatory=$true)]
    [string]$ModuleName
)

$MODULE_DIR = $ModuleName

# Check if module already exists
if (Test-Path $MODULE_DIR) {
    Write-Host "Error: Module $ModuleName already exists"
    exit 1
}

Write-Host "Creating module: $ModuleName"

# Create module directories
New-Item -ItemType Directory -Path "$MODULE_DIR/backend/app/api", "$MODULE_DIR/backend/app/models", "$MODULE_DIR/backend/app/schemas", "$MODULE_DIR/backend/app/services", "$MODULE_DIR/backend/app/utils", "$MODULE_DIR/backend/tests", "$MODULE_DIR/frontend/src", "$MODULE_DIR/frontend/public" -Force

# Create Dockerfile for backend
@"
# Use Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"@ | Out-File -FilePath "$MODULE_DIR/backend/Dockerfile" -Encoding utf8

# Create requirements.txt for backend
@"
# FastAPI and dependencies
fastapi>=0.100.0
uvicorn>=0.23.0
pydantic>=2.0.0
email-validator>=2.0.0

# Database
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.6

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
"@ | Out-File -FilePath "$MODULE_DIR/backend/requirements.txt" -Encoding utf8

# Create docker-compose.yml for the module
@"
# docker-compose.yml for $ModuleName module
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: ${ModuleName}-db
    environment:
      POSTGRES_USER: pulse360
      POSTGRES_PASSWORD: pulse360password
      POSTGRES_DB: ${ModuleName}
    ports:
      - "5432:5432"
    volumes:
      - ${ModuleName}_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulse360"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - ${ModuleName}-network

  redis:
    image: redis:7
    container_name: ${ModuleName}-redis
    ports:
      - "6379:6379"
    volumes:
      - ${ModuleName}_redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - ${ModuleName}-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${ModuleName}-backend
    volumes:
      - ./backend:/app
      - ../shared:/shared
    ports:
      - "8000:8000"
    environment:
      MODULE_NAME: ${ModuleName}
      DATABASE_URL: postgresql://pulse360:pulse360password@db:5432/${ModuleName}
      REDIS_URL: redis://redis:6379/0
      FLUX_AI_API_KEY: `${FLUX_AI_API_KEY}
      SECRET_KEY: `${SECRET_KEY}
      DEBUG: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ${ModuleName}-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ${ModuleName}-frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000
    depends_on:
      - backend
    networks:
      - ${ModuleName}-network

volumes:
  ${ModuleName}_postgres_data:
  ${ModuleName}_redis_data:

networks:
  ${ModuleName}-network:
    driver: bridge
"@ | Out-File -FilePath "$MODULE_DIR/docker-compose.yml" -Encoding utf8

# Create backend Python files
@"
"""
$ModuleName backend package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/__init__.py" -Encoding utf8

@"
"""
Main application module.
"""
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import from shared package
from shared import setup_shared
from shared.auth import get_current_user, router as auth_router

# Setup shared package
setup_shared("$ModuleName")

# Initialize FastAPI app
app = FastAPI(title="$ModuleName API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication router
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])

# Include module routers
from app.api.routers import router as api_router
app.include_router(api_router, prefix="/api", tags=["API"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "module": "$ModuleName"}
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/main.py" -Encoding utf8

@"
"""
API package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/api/__init__.py" -Encoding utf8

@"
"""
API routers.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from shared.db import get_db
from shared.auth import get_current_user

router = APIRouter()

@router.get("/hello")
async def hello_world(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Example endpoint.
    """
    return {
        "message": "Hello from $ModuleName!",
        "user": current_user.email
    }
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/api/routers.py" -Encoding utf8

@"
"""
Database models package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/models/__init__.py" -Encoding utf8

@"
"""
API schemas package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/schemas/__init__.py" -Encoding utf8

@"
"""
Business logic services package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/services/__init__.py" -Encoding utf8

@"
"""
Utilities package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/app/utils/__init__.py" -Encoding utf8

@"
"""
Tests package.
"""
"@ | Out-File -FilePath "$MODULE_DIR/backend/tests/__init__.py" -Encoding utf8

@"
"""
Example test.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_health_check():
    """
    Test health check endpoint.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "module": "$ModuleName"}
"@ | Out-File -FilePath "$MODULE_DIR/backend/tests/test_hello.py" -Encoding utf8

# Create frontend files
@"
# Use Node.js 18
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json .
COPY package-lock.json* .
RUN npm ci

# Copy application
COPY . .

# Start development server
CMD ["npm", "run", "dev"]
"@ | Out-File -FilePath "$MODULE_DIR/frontend/Dockerfile" -Encoding utf8

@"
{
  "name": "$ModuleName-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-query": "^3.39.3",
    "react-router-dom": "^6.14.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
"@ | Out-File -FilePath "$MODULE_DIR/frontend/package.json" -Encoding utf8

@"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$ModuleName</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"@ | Out-File -FilePath "$MODULE_DIR/frontend/index.html" -Encoding utf8

@"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
"@ | Out-File -FilePath "$MODULE_DIR/frontend/src/main.tsx" -Encoding utf8

@"
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">$ModuleName</h1>
        <p className="mb-4">This is the $ModuleName module of Pulse360.</p>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
"@ | Out-File -FilePath "$MODULE_DIR/frontend/src/App.tsx" -Encoding utf8

@"
@tailwind base;
@tailwind components;
@tailwind utilities;
"@ | Out-File -FilePath "$MODULE_DIR/frontend/src/index.css" -Encoding utf8

@"
/* Add your custom styles here */
"@ | Out-File -FilePath "$MODULE_DIR/frontend/src/App.css" -Encoding utf8

@"
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
"@ | Out-File -FilePath "$MODULE_DIR/frontend/tsconfig.json" -Encoding utf8

@"
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
"@ | Out-File -FilePath "$MODULE_DIR/frontend/tsconfig.node.json" -Encoding utf8

@"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
"@ | Out-File -FilePath "$MODULE_DIR/frontend/vite.config.ts" -Encoding utf8

@"
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
"@ | Out-File -FilePath "$MODULE_DIR/frontend/tailwind.config.js" -Encoding utf8

@"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"@ | Out-File -FilePath "$MODULE_DIR/frontend/postcss.config.js" -Encoding utf8

Write-Host "Module $ModuleName created successfully"
Write-Host ""
Write-Host "To start the module:"
Write-Host "  cd $MODULE_DIR"
Write-Host "  docker-compose up"
Write-Host ""
Write-Host "Backend will be available at: http://localhost:8000"
Write-Host "Frontend will be available at: http://localhost:3000"