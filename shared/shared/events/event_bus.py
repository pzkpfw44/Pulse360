"""
Event bus for cross-module communication.
"""
import asyncio
import json
import os
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Awaitable

import redis
from loguru import logger
from sqlalchemy.orm import Session

from ..db.models import EventLog

class EventBus:
    """
    Event bus for cross-module communication using Redis Pub/Sub.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """
        Singleton pattern to ensure only one event bus instance.
        """
        if cls._instance is None:
            cls._instance = super(EventBus, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        redis_url: Optional[str] = None,
        db: Optional[Session] = None,
        source_module: str = "unknown"
    ):
        """
        Initialize the event bus.
        
        Args:
            redis_url: The Redis URL. If not provided, will be read from environment.
            db: Database session for logging events. If not provided, logging will be disabled.
            source_module: The name of the source module.
        """
        # Skip initialization if already initialized
        if self._initialized:
            return
            
        # Set up Redis connection
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis = redis.Redis.from_url(self.redis_url)
        self.pubsub = self.redis.pubsub()
        
        # Set up handlers and state
        self.handlers: Dict[str, List[Callable[[Dict[str, Any]], Awaitable[None]]]] = {}
        self.running = False
        self.db = db
        self.source_module = source_module
        
        # Mark as initialized
        self._initialized = True
        
        logger.info(f"Event bus initialized for module: {self.source_module}")
        
    async def publish(
        self,
        event_type: str,
        data: Dict[str, Any],
        log_event: bool = True
    ) -> None:
        """
        Publish an event to the event bus.
        
        Args:
            event_type: The type of event.
            data: The event data.
            log_event: Whether to log the event to the database.
        """
        # Create event
        event = {
            "type": event_type,
            "data": data,
            "source_module": self.source_module,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Publish to Redis
        event_json = json.dumps(event)
        self.redis.publish(f"events:{event_type}", event_json)
        
        logger.debug(f"Published event: {event_type} from {self.source_module}")
        
        # Log to database if enabled
        if log_event and self.db:
            event_log = EventLog(
                event_type=event_type,
                event_data=data,
                source_module=self.source_module
            )
            self.db.add(event_log)
            self.db.commit()
    
    def subscribe(
        self,
        event_type: str,
        handler: Callable[[Dict[str, Any]], Awaitable[None]]
    ) -> None:
        """
        Subscribe to an event type with a handler function.
        
        Args:
            event_type: The type of event to subscribe to.
            handler: The async function to call when the event occurs.
        """
        # Add to handlers
        if event_type not in self.handlers:
            self.handlers[event_type] = []
            self.pubsub.subscribe(f"events:{event_type}")
            
        self.handlers[event_type].append(handler)
        
        logger.debug(f"Subscribed to event: {event_type} in {self.source_module}")
    
    async def start_listening(self) -> None:
        """
        Start listening for events in the background.
        """
        self.running = True
        
        logger.info(f"Event bus started listening in {self.source_module}")
        
        while self.running:
            # Get message
            message = self.pubsub.get_message(ignore_subscribe_messages=True)
            
            if message:
                # Parse message
                channel = message["channel"].decode("utf-8")
                event_type = channel.split(":")[1]
                
                if event_type in self.handlers:
                    try:
                        # Parse event data
                        event_data = json.loads(message["data"].decode("utf-8"))
                        
                        # Call handlers
                        for handler in self.handlers[event_type]:
                            try:
                                await handler(event_data)
                            except Exception as e:
                                logger.error(f"Error in event handler for {event_type}: {e}")
                                
                    except json.JSONDecodeError:
                        logger.error(f"Error decoding event data: {message['data']}")
            
            # Sleep to prevent CPU hogging
            await asyncio.sleep(0.1)
    
    def stop_listening(self) -> None:
        """
        Stop listening for events.
        """
        self.running = False
        self.pubsub.unsubscribe()
        
        logger.info(f"Event bus stopped listening in {self.source_module}")


# Create global event bus instance
event_bus = EventBus()