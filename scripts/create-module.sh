#!/bin/bash
# Create a new module

# Exit on error
set -e

# Check for module name argument
if [ -z "$1" ]; then
  echo "Usage: $0 <module_name>"
  exit 1
fi

MODULE_NAME=$1
MODULE_DIR="${MODULE_NAME}"

# Check if module already exists
if [ -d "$MODULE_DIR" ]; then
  echo "Error: Module $MODULE_NAME already exists"
  exit 1
fi

echo "Creating module: $MODULE_NAME"

# Create module directories
mkdir -p "$MODULE_DIR"/{backend,frontend}
mkdir -p "$MODULE_DIR/backend/app"/{api,models,schemas,services,utils}
mkdir -p "$MODULE_DIR/backend/tests"

# Create backend files
cat > "$MODULE_DIR/Dockerfile" << EOF
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

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EOF

cat > "$MODULE_DIR/requirements.txt" << EOF
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
EOF

cat > "$MODULE_DIR/docker-compose.yml" << EOF
# docker-compose.yml for $MODULE_NAME module
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: ${MODULE_NAME}-db
    environment:
      POSTGRES_USER: pulse360
      POSTGRES_PASSWORD: pulse360password
      POSTGRES_DB: ${MODULE_NAME}
    ports:
      - "5432:5432"
    volumes:
      - ${MODULE_NAME}_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulse360"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - ${MODULE_NAME}-network

  redis:
    image: redis:7
    container_name: ${MODULE_NAME}-redis
    ports:
      - "6379:6379"
    volumes:
      - ${MODULE_NAME}_redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - ${MODULE_NAME}-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${MODULE_NAME}-backend
    volumes:
      - ./backend:/app
      - ../shared:/shared
    ports:
      - "8000:8000"
    environment:
      MODULE_NAME: ${MODULE_NAME}
      DATABASE_URL: postgresql://pulse360:pulse360password@db:5432/${MODULE_NAME}
      REDIS_URL: redis://redis:6379/0
      FLUX_AI_API_KEY: \${FLUX_AI_API_KEY}
      SECRET_KEY: \${SECRET_KEY}
      DEBUG: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ${MODULE_NAME}-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ${MODULE_NAME}-frontend
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
      - ${MODULE_NAME}-network

volumes:
  ${MODULE_NAME}_postgres_data:
  ${MODULE_NAME}_redis_data:

networks:
  ${MODULE_NAME}-network:
    driver: bridge
EOF

cat > "$MODULE_DIR/backend/app/__init__.py" << EOF
"""
$MODULE_NAME backend package.
"""
EOF

cat > "$MODULE_DIR/backend/app/main.py" << EOF
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
setup_shared("$MODULE_NAME")

# Initialize FastAPI app
app = FastAPI(title="$MODULE_NAME API")

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
    return {"status": "ok", "module": "$MODULE_NAME"}
EOF

cat > "$MODULE_DIR/backend/app/api/__init__.py" << EOF
"""
API package.
"""
EOF

cat > "$MODULE_DIR/backend/app/api/routers.py" << EOF
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
        "message": "Hello from $MODULE_NAME!",
        "user": current_user.email
    }
EOF

cat > "$MODULE_DIR/backend/app/models/__init__.py" << EOF
"""
Database models package.
"""
EOF

cat > "$MODULE_DIR/backend/app/schemas/__init__.py" << EOF
"""
API schemas package.
"""
EOF

cat > "$MODULE_DIR/backend/app/services/__init__.py" << EOF
"""
Business logic services package.
"""
EOF

cat > "$MODULE_DIR/backend/app/utils/__init__.py" << EOF
"""
Utilities package.
"""
EOF

cat > "$MODULE_DIR/backend/tests/__init__.py" << EOF
"""
Tests package.
"""
EOF

cat > "$MODULE_DIR/backend/tests/test_hello.py" << EOF
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
    assert response.json() == {"status": "ok", "module": "$MODULE_NAME"}
EOF

# Create frontend files
mkdir -p "$MODULE_DIR/frontend/src"
mkdir -p "$MODULE_DIR/frontend/public"

cat > "$MODULE_DIR/frontend/Dockerfile" << EOF
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
EOF

cat > "$MODULE_DIR/frontend/package.json" << EOF
{
  "name": "$MODULE_NAME-frontend",
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
EOF

cat > "$MODULE_DIR/frontend/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$MODULE_NAME</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat > "$MODULE_DIR/frontend/src/main.tsx" << EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > "$MODULE_DIR/frontend/src/App.tsx" << EOF
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">$MODULE_NAME</h1>
        <p className="mb-4">This is the $MODULE_NAME module of Pulse360.</p>
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
EOF

cat > "$MODULE_DIR/frontend/src/index.css" << EOF
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cat > "$MODULE_DIR/frontend/src/App.css" << EOF
/* Add your custom styles here */
EOF

cat > "$MODULE_DIR/frontend/tsconfig.json" << EOF
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
EOF

cat > "$MODULE_DIR/frontend/tsconfig.node.json" << EOF
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
EOF

cat > "$MODULE_DIR/frontend/vite.config.ts" << EOF
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
EOF

cat > "$MODULE_DIR/frontend/tailwind.config.js" << EOF
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
EOF

cat > "$MODULE_DIR/frontend/postcss.config.js" << EOF
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo "Module $MODULE_NAME created successfully"
echo ""
echo "To start the module:"
echo "  cd $MODULE_DIR"
echo "  docker-compose up"
echo ""
echo "Backend will be available at: http://localhost:8000"
echo "Frontend will be available at: http://localhost:3000"