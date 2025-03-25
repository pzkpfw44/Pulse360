#!/bin/bash

# This script is used to start either the API server or a Celery worker
# based on the WORKER_TYPE environment variable

if [ "$WORKER_TYPE" = "celery" ]; then
    echo "Starting Celery worker..."
    celery -A app.tasks.celery_app worker --loglevel=info
elif [ "$WORKER_TYPE" = "beat" ]; then
    echo "Starting Celery beat scheduler..."
    celery -A app.tasks.celery_app beat --loglevel=info
else
    echo "Starting API server..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 ${RELOAD:+--reload}
fi