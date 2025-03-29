# Setup development environment for Windows

# Check if .env file exists, if not create it from example
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit .env file with your configuration"
}

# Build and start the containers
Write-Host "Building and starting containers..."
docker-compose up -d db redis minio

# Wait for database to be ready
Write-Host "Waiting for database to be ready..."
Start-Sleep -Seconds 5

# Build the shared package
Write-Host "Building shared package..."
docker-compose build shared

# Run database migrations
Write-Host "Running database migrations..."
docker-compose run --rm shared bash -c "cd /app && alembic upgrade head"

# Create admin user if it doesn't exist
Write-Host "Creating admin user if it doesn't exist..."
docker-compose run --rm shared python -c "
from shared.db import SessionLocal
from shared.db.models import User
from shared.auth.security import get_password_hash
from sqlalchemy.sql import exists

with SessionLocal() as db:
    # Check if admin user exists
    admin_exists = db.query(exists().where(User.email == 'admin@pulse360.com')).scalar()
    
    if not admin_exists:
        admin = User(
            email='admin@pulse360.com',
            full_name='Admin User',
            hashed_password=get_password_hash('adminpassword'),
            role='admin'
        )
        db.add(admin)
        db.commit()
        print('Admin user created')
    else:
        print('Admin user already exists')
"

Write-Host "Development environment setup complete!"
Write-Host "Default admin credentials:"
Write-Host "  Email: admin@pulse360.com"
Write-Host "  Password: adminpassword"
Write-Host ""
Write-Host "You should change these credentials in production."