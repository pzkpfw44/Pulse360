import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable, Awaitable, TypeVar, cast

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete

from app.core.config import settings
from app.models.cache import AICache
from app.db.session import get_db

logger = logging.getLogger(__name__)

T = TypeVar('T')


class FluxAICache:
    """
    Cache for Flux AI API calls to reduce API usage and improve response times
    """
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize the cache with Redis and database
        
        Args:
            redis_url: Redis URL
        """
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis = redis.from_url(self.redis_url)
        self.default_ttl = 3600  # 1 hour
    
    async def get_or_execute(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        ttl: Optional[int] = None,
        cache_key: Optional[str] = None,
        **kwargs
    ) -> T:
        """
        Get a value from cache or execute a function and cache the result
        
        Args:
            func: Function to execute if cache miss
            *args: Arguments to pass to the function
            ttl: Cache TTL in seconds
            cache_key: Optional custom cache key
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Cached or fresh result
        """
        # Generate cache key
        if cache_key is None:
            cache_key = self._generate_cache_key(func, args, kwargs)
        
        # Try to get from Redis first (fast)
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            logger.debug(f"Redis cache hit for {cache_key}")
            return cast(T, json.loads(cached_data))
        
        # Try to get from database cache (slower but persistent)
        db_result = await self._get_from_db_cache(cache_key)
        if db_result:
            logger.debug(f"DB cache hit for {cache_key}")
            # Populate Redis cache for next time
            await self.redis.set(
                cache_key,
                json.dumps(db_result),
                ex=ttl or self.default_ttl
            )
            return cast(T, db_result)
        
        # Cache miss, execute function
        logger.debug(f"Cache miss for {cache_key}, executing function")
        result = await func(*args, **kwargs)
        
        # Cache the result
        await self._cache_result(cache_key, result, ttl)
        
        return result
    
    async def _cache_result(self, cache_key: str, result: Any, ttl: Optional[int] = None) -> None:
        """
        Cache a result in Redis and database
        
        Args:
            cache_key: Cache key
            result: Result to cache
            ttl: Cache TTL in seconds
        """
        # Cache in Redis (fast access)
        await self.redis.set(
            cache_key,
            json.dumps(result),
            ex=ttl or self.default_ttl
        )
        
        # Cache in database (persistent)
        expires_at = datetime.utcnow() + timedelta(seconds=ttl or self.default_ttl)
        async for db in get_db():
            try:
                ai_cache = AICache(
                    request_hash=cache_key,
                    response_data=result,
                    expires_at=expires_at
                )
                db.add(ai_cache)
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.error(f"Error caching result in database: {str(e)}")
    
    async def _get_from_db_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get a value from database cache
        
        Args:
            cache_key: Cache key
            
        Returns:
            Cached value or None
        """
        async for db in get_db():
            try:
                # Check if cache exists and is not expired
                query = select(AICache).where(
                    AICache.request_hash == cache_key,
                    AICache.expires_at > datetime.utcnow()
                )
                result = await db.execute(query)
                cache_entry = result.scalars().first()
                
                if cache_entry:
                    return cache_entry.response_data
                return None
            except Exception as e:
                logger.error(f"Error getting cache from database: {str(e)}")
                return None
    
    def _generate_cache_key(self, func: Callable, args: tuple, kwargs: dict) -> str:
        """
        Generate a cache key for a function call
        
        Args:
            func: Function being called
            args: Function arguments
            kwargs: Function keyword arguments
            
        Returns:
            Cache key
        """
        # Create a unique key based on function name and arguments
        key_parts = [func.__name__]
        
        # Add stringified args
        for arg in args:
            key_parts.append(str(arg))
        
        # Add stringified kwargs (sorted to ensure consistency)
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        
        # Join parts and hash
        key_str = ":".join(key_parts)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    async def invalidate(self, cache_key: str) -> None:
        """
        Invalidate a cache entry
        
        Args:
            cache_key: Cache key to invalidate
        """
        # Remove from Redis
        await self.redis.delete(cache_key)
        
        # Remove from database
        async for db in get_db():
            try:
                query = delete(AICache).where(AICache.request_hash == cache_key)
                await db.execute(query)
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.error(f"Error invalidating cache: {str(e)}")
    
    async def cleanup_expired(self) -> int:
        """
        Clean up expired cache entries
        
        Returns:
            Number of entries removed
        """
        count = 0
        async for db in get_db():
            try:
                query = delete(AICache).where(AICache.expires_at < datetime.utcnow())
                result = await db.execute(query)
                count = result.rowcount
                await db.commit()
                logger.info(f"Removed {count} expired cache entries")
            except Exception as e:
                await db.rollback()
                logger.error(f"Error cleaning up expired cache: {str(e)}")
        
        return count


# Create a singleton instance
flux_ai_cache = FluxAICache()