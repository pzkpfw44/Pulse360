import os
from app.tasks.celery_app import celery_app

if __name__ == "__main__":
    # This file is used to start the Celery worker
    # Usage: python celery_worker.py
    celery_app.worker_main(["worker", "--loglevel=info"])