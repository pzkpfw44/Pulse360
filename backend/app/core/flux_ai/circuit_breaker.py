import functools
import logging
import time
from enum import Enum
from typing import Callable, Any, Dict

import httpx
from app.core.flux_ai.fallback import get_fallback_response

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """
    Enum for circuit breaker state
    """
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # No requests are allowed through
    HALF_OPEN = "half_open"  # Testing if service is available again


class CircuitBreaker:
    """
    Circuit breaker for Flux AI API calls to prevent cascading failures
    """
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        fallback_handler: Callable = None
    ):
        """
        Initialize the circuit breaker
        
        Args:
            failure_threshold: Number of failures before opening the circuit
            recovery_timeout: Time in seconds before trying to recover
            fallback_handler: Function to call when circuit is open
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.fallback_handler = fallback_handler or get_fallback_response
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
    
    def __call__(self, func):
        """
        Decorator for circuit breaker
        
        Args:
            func: Function to wrap
            
        Returns:
            Wrapped function
        """
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await self.call(func, *args, **kwargs)
        return wrapper
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Call the function with circuit breaker logic
        
        Args:
            func: Function to call
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Result of the function or fallback
        """
        if self.state == CircuitState.OPEN:
            if time.time() > self.last_failure_time + self.recovery_timeout:
                # Try to recover
                logger.info("Circuit half-open, testing service availability")
                self.state = CircuitState.HALF_OPEN
            else:
                # Circuit is still open, use fallback
                logger.warning(f"Circuit is open, using fallback for {func.__name__}")
                return self.fallback_handler(func.__name__, *args, **kwargs)
        
        try:
            result = await func(*args, **kwargs)
            
            # If we're in half-open state and the call succeeded, close the circuit
            if self.state == CircuitState.HALF_OPEN:
                logger.info("Service is available again, closing circuit")
                self.state = CircuitState.CLOSED
                self.failure_count = 0
            
            return result
        
        except (httpx.HTTPError, httpx.TimeoutException, Exception) as e:
            # Handle failure
            self.record_failure()
            
            if self.state == CircuitState.OPEN:
                # Circuit is open, use fallback
                logger.warning(f"Circuit is open, using fallback for {func.__name__}")
                return self.fallback_handler(func.__name__, *args, **kwargs)
            else:
                # Still in closed or half-open state, raise the exception
                logger.error(f"Error in {func.__name__}: {str(e)}")
                raise
    
    def record_failure(self):
        """Record a failure and update the circuit state"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if (self.state == CircuitState.CLOSED and 
            self.failure_count >= self.failure_threshold):
            # Too many failures, open the circuit
            logger.warning(f"Circuit opening after {self.failure_count} failures")
            self.state = CircuitState.OPEN
        
        if self.state == CircuitState.HALF_OPEN:
            # Failed during recovery, back to open
            logger.warning("Failed during recovery, reopening circuit")
            self.state = CircuitState.OPEN


# Singleton instance
circuit_breaker = CircuitBreaker()