import json
import logging
from typing import Dict, List, Optional, Any, Union, BinaryIO
import httpx
from app.core.config import settings
from app.core.flux_ai.circuit_breaker import circuit_breaker

logger = logging.getLogger(__name__)


class FluxAIClient:
    """
    Client for interacting with the Flux AI API
    """
    def __init__(self, api_key: str = None, base_url: str = None):
        """
        Initialize the Flux AI client
        
        Args:
            api_key: Flux AI API key
            base_url: Flux AI API base URL
        """
        self.api_key = api_key or settings.FLUX_AI_API_KEY
        self.base_url = base_url or settings.FLUX_AI_BASE_URL
        self.headers = {
            "X-API-Key": self.api_key,
            "Accept": "application/json"
        }
    
    @circuit_breaker
    async def upload_file(self, file: BinaryIO, filename: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Upload a file to Flux AI
        
        Args:
            file: File object to upload
            filename: Name of the file
            tags: Optional list of tags
            
        Returns:
            Response from Flux AI API
        """
        url = f"{self.base_url}/v1/files"
        
        # Prepare form data
        files = {"files": (filename, file)}
        data = {}
        
        if tags:
            data["tags"] = tags
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=self.headers,
                files=files,
                data=data
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to upload file to Flux AI: {response.text}")
                response.raise_for_status()
            
            return response.json()
    
    @circuit_breaker
    async def list_files(self) -> Dict[str, Any]:
        """
        List all files uploaded to Flux AI
        
        Returns:
            Response from Flux AI API with file list
        """
        url = f"{self.base_url}/v1/files"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to list files from Flux AI: {response.text}")
                response.raise_for_status()
            
            return response.json()
    
    @circuit_breaker
    async def get_file(self, file_id: str) -> Dict[str, Any]:
        """
        Get file details from Flux AI
        
        Args:
            file_id: ID of the file
            
        Returns:
            Response from Flux AI API with file details
        """
        url = f"{self.base_url}/v1/files/{file_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to get file from Flux AI: {response.text}")
                response.raise_for_status()
            
            return response.json()
    
    @circuit_breaker
    async def delete_file(self, file_id: str) -> Dict[str, Any]:
        """
        Delete a file from Flux AI
        
        Args:
            file_id: ID of the file
            
        Returns:
            Response from Flux AI API
        """
        url = f"{self.base_url}/v1/files/{file_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.delete(url, headers=self.headers)
            
            if response.status_code != 200:
                logger.error(f"Failed to delete file from Flux AI: {response.text}")
                response.raise_for_status()
            
            return response.json()
    
    @circuit_breaker
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        attachments: Optional[Dict[str, Any]] = None,
        preamble: Optional[str] = None,
        model: Optional[str] = None,
        stream: bool = False,
        mode: str = "rag"
    ) -> Dict[str, Any]:
        """
        Get chat completion from Flux AI
        
        Args:
            messages: List of messages
            attachments: Optional dict of file attachments
            preamble: Optional system message
            model: Optional model to use
            stream: Whether to stream the response
            mode: RAG mode ('rag', 'summary', 'query')
            
        Returns:
            Response from Flux AI API
        """
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "messages": messages,
            "stream": stream
        }
        
        if attachments:
            payload["attachments"] = attachments
        
        if preamble:
            payload["preamble"] = preamble
        
        if model:
            payload["model"] = model
            
        if mode:
            payload["mode"] = mode
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers={**self.headers, "Content-Type": "application/json"},
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get chat completion from Flux AI: {response.text}")
                response.raise_for_status()
            
            return response.json()


# Singleton instance
flux_ai_client = FluxAIClient()