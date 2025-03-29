#!/bin/bash
# Setup development environment

# Exit on error
set -e

# Check if .env file exists, if not create it from example
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please edit .env file with your configuration"
fi

# Build and start the containers
echo "Building and starting containers..."
docker-compose up -d db redis minio

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Build the shared package
echo "Building shared package..."
docker-compose build shared

# Run database migrations
echo "Running database migrations..."
docker-compose run --rm shared bash -c "cd /app && alembic upgrade head"

# Create admin user if it doesn't exist
echo "Creating admin user if it doesn't exist..."
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

echo "Development environment setup complete!"
echo "Default admin credentials:"
echo "  Email: admin@pulse360.com"
echo "  Password: adminpassword"
echo ""
echo "You should change these credentials in production."