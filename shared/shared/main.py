"""
Shared package initialization.
"""
import os
from typing import Optional

from .db import init_db
from .db.base import SessionLocal
from .ai import FluxAIClient
from .events import event_bus
from .utils.logger import setup_logging
from .utils.storage import storage_client

def setup_shared(
    module_name: str,
    log_level: Optional[str] = None,
    init_database: bool = True
) -> None:
    """
    Set up the shared package.
    
    Args:
        module_name: The name of the module.
        log_level: The log level.
        init_database: Whether to initialize the database.
    """
    # Set up logging
    setup_logging(module_name, log_level=log_level)
    
    # Initialize database if requested
    if init_database:
        init_db()
    
    # Initialize event bus with module name
    with SessionLocal() as db:
        event_bus.__init__(source_module=module_name, db=db)
    
    # Initialize storage client
    storage_client.__init__()
    
    # Initialize Flux AI client
    flux_api_key = os.getenv("FLUX_AI_API_KEY")
    
    if not flux_api_key:
        print("WARNING: FLUX_AI_API_KEY not set. Flux AI integration will not work.")
    else:
        with SessionLocal() as db:
            FluxAIClient(api_key=flux_api_key, db=db)