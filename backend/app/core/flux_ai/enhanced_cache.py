import logging
import json
import hashlib
import backoff
from datetime import datetime, timedelta
from typing import Optional, Any, Dict, TypeVar, Callable, Awaitable, cast
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from httpx import HTTPError, TimeoutException

from app.core.config import settings
from app.models.cache import AICache

logger = logging.getLogger(__name__)

T = TypeVar('T')


class EnhancedCache:
    """
    Enhanced caching service for AI responses with retry capabilities
    """
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize cache with Redis connection
        
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
        bypass_cache: bool = False,
        **kwargs
    ) -> T:
        """
        Get a value from cache or execute a function and cache the result
        
        Args:
            func: Function to execute if cache miss
            *args: Arguments to pass to the function
            ttl: Cache TTL in seconds
            cache_key: Optional custom cache key
            bypass_cache: Skip cache lookup and force execution
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Cached or fresh result
        """
        # Generate cache key
        if cache_key is None:
            cache_key = self._generate_cache_key(func, args, kwargs)
        
        # If bypassing cache, execute function directly
        if bypass_cache:
            return await self._execute_with_retry(func, *args, **kwargs)
        
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
        
        # Cache miss, execute function with retry
        logger.debug(f"Cache miss for {cache_key}, executing function with retry")
        result = await self._execute_with_retry(func, *args, **kwargs)
        
        # Cache the result
        await self._cache_result(cache_key, result, ttl)
        
        return result
    
    @backoff.on_exception(
        backoff.expo,
        (HTTPError, TimeoutException),
        max_tries=3,
        max_time=30,
        giveup=lambda e: getattr(e, 'response', None) and e.response.status_code < 500
    )
    async def _execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with exponential backoff retry for transient errors
        
        Args:
            func: Function to execute
            *args: Arguments for the function
            **kwargs: Keyword arguments for the function
            
        Returns:
            Function result
        """
        return await func(*args, **kwargs)
    
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
        
        # Import here to avoid circular imports
        from app.db.session import get_db
        
        async for db in get_db():
            try:
                # Check if cache entry already exists
                query = select(AICache).where(AICache.request_hash == cache_key)
                result_db = await db.execute(query)
                cache_entry = result_db.scalars().first()
                
                if cache_entry:
                    # Update existing entry
                    cache_entry.response_data = result
                    cache_entry.expires_at = expires_at
                else:
                    # Create new entry
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
        # Import here to avoid circular imports
        from app.db.session import get_db
        
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
            if isinstance(arg, (str, int, float, bool, type(None))):
                key_parts.append(str(arg))
            else:
                # For complex objects, use their repr or hash
                try:
                    key_parts.append(hash(arg))
                except:
                    key_parts.append(str(id(arg)))
        
        # Add stringified kwargs (sorted to ensure consistency)
        for k, v in sorted(kwargs.items()):
            if isinstance(v, (str, int, float, bool, type(None))):
                key_parts.append(f"{k}:{v}")
            else:
                # For complex objects, use their repr or hash
                try:
                    key_parts.append(f"{k}:{hash(v)}")
                except:
                    key_parts.append(f"{k}:{id(v)}")
        
        # Join parts and hash
        key_str = ":".join(map(str, key_parts))
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
        from app.db.session import get_db
        
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
        
        # Remove from database
        from app.db.session import get_db
        
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
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Cache statistics
        """
        from app.db.session import get_db
        
        # Initialize stats
        stats = {
            "total_entries": 0,
            "active_entries": 0,
            "expired_entries": 0,
            "redis_keys": 0,
            "redis_memory_used": "0",
            "db_oldest_entry": None,
            "db_newest_entry": None,
        }
        
        # Get Redis stats
        try:
            stats["redis_keys"] = await self.redis.dbsize()
            info = await self.redis.info("memory")
            stats["redis_memory_used"] = info.get("used_memory_human", "0")
        except Exception as e:
            logger.error(f"Error getting Redis stats: {str(e)}")
        
        # Get database stats
        async for db in get_db():
            try:
                # Total entries
                total_query = select(func.count()).select_from(AICache)
                result = await db.execute(total_query)
                stats["total_entries"] = result.scalar()
                
                # Active entries
                active_query = select(func.count()).select_from(AICache).where(
                    AICache.expires_at > datetime.utcnow()
                )
                result = await db.execute(active_query)
                stats["active_entries"] = result.scalar()
                
                # Expired entries
                stats["expired_entries"] = stats["total_entries"] - stats["active_entries"]
                
                # Oldest entry
                oldest_query = select(AICache).order_by(AICache.created_at.asc()).limit(1)
                result = await db.execute(oldest_query)
                oldest = result.scalars().first()
                if oldest:
                    stats["db_oldest_entry"] = oldest.created_at.isoformat()
                
                # Newest entry
                newest_query = select(AICache).order_by(AICache.created_at.desc()).limit(1)
                result = await db.execute(newest_query)
                newest = result.scalars().first()
                if newest:
                    stats["db_newest_entry"] = newest.created_at.isoformat()
                
            except Exception as e:
                logger.error(f"Error getting database cache stats: {str(e)}")
        
        return stats


# Create a singleton instance
enhanced_cache = EnhancedCache()