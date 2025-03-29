"""
Flux AI client.
"""
import hashlib
import json
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
from loguru import logger
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..db.models import AICache

class FluxAIClient:
    """
    Client for interacting with Flux AI API.
    """
    
    def __init__(self, api_key: Optional[str] = None, db: Optional[Session] = None):
        """
        Initialize the Flux AI client.
        
        Args:
            api_key: The Flux AI API key. If not provided, will be read from environment.
            db: Database session for caching. If not provided, caching will be disabled.
        """
        self.api_key = api_key or os.getenv("FLUX_AI_API_KEY")
        if not self.api_key:
            logger.warning("No Flux AI API key provided. Set FLUX_AI_API_KEY environment variable.")
            
        self.base_url = "https://api.flux.ai/v1"
        self.db = db
        
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.RequestError)
    )
    async def _request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a request to the Flux AI API.
        
        Args:
            endpoint: The API endpoint.
            data: The request data.
            
        Returns:
            Dict[str, Any]: The API response.
            
        Raises:
            HTTPException: If the request fails.
        """
        if not self.api_key:
            raise ValueError("No Flux AI API key provided")
            
        logger.debug(f"Making request to Flux AI: {endpoint}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{endpoint}",
                json=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            try:
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Flux AI request failed: {e.response.text}")
                raise
                
    async def complete(
        self,
        prompt: str,
        use_cache: bool = True,
        cache_ttl_days: int = 1
    ) -> Dict[str, Any]:
        """
        Generate a completion from Flux AI.
        
        Args:
            prompt: The prompt to generate from.
            use_cache: Whether to use caching.
            cache_ttl_days: How long to cache responses for, in days.
            
        Returns:
            Dict[str, Any]: The completion response.
        """
        # Check cache if enabled
        if use_cache and self.db:
            request_hash = hashlib.md5(
                json.dumps({"prompt": prompt}).encode()
            ).hexdigest()
            
            cache_entry = self.db.query(AICache).filter(
                AICache.request_hash == request_hash,
                AICache.expires_at > datetime.utcnow()
            ).first()
            
            if cache_entry:
                logger.debug(f"Cache hit for prompt hash: {request_hash}")
                return cache_entry.response_data
                
        # Make API request
        try:
            result = await self._request(
                "completions",
                {"prompt": prompt, "max_tokens": 2048}
            )
            
            # Cache result if enabled
            if use_cache and self.db:
                cache_entry = AICache(
                    request_hash=request_hash,
                    response_data=result,
                    expires_at=datetime.utcnow() + timedelta(days=cache_ttl_days)
                )
                self.db.add(cache_entry)
                self.db.commit()
                
            return result
            
        except Exception as e:
            logger.error(f"Error calling Flux AI: {e}")
            
            # Try to return cached response even if expired
            if use_cache and self.db:
                expired_cache = self.db.query(AICache).filter(
                    AICache.request_hash == request_hash
                ).first()
                
                if expired_cache:
                    logger.info(f"Returning expired cache for prompt hash: {request_hash}")
                    return expired_cache.response_data
                    
            # Re-raise if no cached response
            raise
            
    async def process_document(
        self,
        document_content: str,
        document_type: str,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Process a document with Flux AI.
        
        Args:
            document_content: The document content.
            document_type: The document type (e.g., "pdf", "docx").
            use_cache: Whether to use caching.
            
        Returns:
            Dict[str, Any]: The document processing response.
        """
        # Check cache if enabled
        if use_cache and self.db:
            request_hash = hashlib.md5(
                json.dumps({
                    "content": document_content,
                    "type": document_type
                }).encode()
            ).hexdigest()
            
            cache_entry = self.db.query(AICache).filter(
                AICache.request_hash == request_hash,
                AICache.expires_at > datetime.utcnow()
            ).first()
            
            if cache_entry:
                logger.debug(f"Cache hit for document hash: {request_hash}")
                return cache_entry.response_data
                
        # Make API request
        try:
            result = await self._request(
                "documents/process",
                {
                    "content": document_content,
                    "type": document_type
                }
            )
            
            # Cache result if enabled
            if use_cache and self.db:
                cache_entry = AICache(
                    request_hash=request_hash,
                    response_data=result,
                    expires_at=datetime.utcnow() + timedelta(days=30)  # Cache document processing longer
                )
                self.db.add(cache_entry)
                self.db.commit()
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing document with Flux AI: {e}")
            
            # Try to return cached response even if expired
            if use_cache and self.db:
                expired_cache = self.db.query(AICache).filter(
                    AICache.request_hash == request_hash
                ).first()
                
                if expired_cache:
                    logger.info(f"Returning expired cache for document hash: {request_hash}")
                    return expired_cache.response_data
                    
            # Re-raise if no cached response
            raise