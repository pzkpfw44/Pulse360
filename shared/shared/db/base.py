"""
Database base configuration and utilities.
"""
from typing import Any
import os

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import text

from loguru import logger

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://pulse360:pulse360password@localhost:5432/pulse360")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Database dependency
def get_db() -> Session:
    """
    Get a database session.
    
    Yields:
        Session: A SQLAlchemy session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """
    Initialize the database, creating tables if they don't exist.
    """
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Test connection
    try:
        with SessionLocal() as session:
            result = session.execute(text("SELECT 1"))
            logger.info(f"Database connection test: {result.scalar()}")
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise