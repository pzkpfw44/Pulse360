import os
from celery import Celery
from app.core.config import settings

# Create the Celery app
celery_app = Celery(
    "pulse360",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.report_tasks",
    ]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_max_tasks_per_child=1000,
    worker_prefetch_multiplier=1,
)

# Optional: create schedule if needed
# celery_app.conf.beat_schedule = {
#     "cleanup-expired-cache": {
#         "task": "app.tasks.cache_tasks.cleanup_expired_cache",
#         "schedule": 3600.0,  # Every hour
#     },
# }