"""
Logging configuration.
"""
import os
import sys
from typing import Dict, Any, Optional

from loguru import logger

# Get log level from environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

def setup_logging(
    module_name: str,
    log_file: Optional[str] = None,
    log_level: Optional[str] = None
) -> None:
    """
    Set up logging configuration.
    
    Args:
        module_name: The name of the module.
        log_file: Path to the log file. If not provided, logs will be written to stdout.
        log_level: The log level. If not provided, will be read from environment.
    """
    # Use default log level if not provided
    level = log_level or LOG_LEVEL
    
    # Remove default logger
    logger.remove()
    
    # Configure logger format
    log_format = "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    
    # Add stdout handler
    logger.add(
        sys.stdout,
        format=log_format,
        level=level,
        filter=lambda record: record["extra"].get("module", "") == module_name
    )
    
    # Add file handler if log file is provided
    if log_file:
        logger.add(
            log_file,
            format=log_format,
            level=level,
            rotation="10 MB",
            retention="1 week",
            filter=lambda record: record["extra"].get("module", "") == module_name
        )
    
    # Configure default extra attributes
    logger = logger.bind(module=module_name)
    
    logger.info(f"Logging configured for module: {module_name} at level: {level}")