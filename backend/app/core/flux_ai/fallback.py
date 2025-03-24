"""
Fallback strategies for Flux AI API calls when the service is unavailable
"""
import logging
from typing import Dict, Any, List, Optional, BinaryIO

logger = logging.getLogger(__name__)


def get_fallback_response(
    function_name: str, *args, **kwargs
) -> Dict[str, Any]:
    """
    Get a fallback response for a function call
    
    Args:
        function_name: Name of the function
        *args: Arguments passed to the function
        **kwargs: Keyword arguments passed to the function
        
    Returns:
        Fallback response
    """
    # Log the fallback call
    logger.warning(f"Using fallback for {function_name}")
    
    # Different fallbacks based on the function name
    if function_name == "upload_file":
        return _fallback_upload_file(*args, **kwargs)
    elif function_name == "list_files":
        return _fallback_list_files(*args, **kwargs)
    elif function_name == "get_file":
        return _fallback_get_file(*args, **kwargs)
    elif function_name == "delete_file":
        return _fallback_delete_file(*args, **kwargs)
    elif function_name == "chat_completion":
        return _fallback_chat_completion(*args, **kwargs)
    else:
        return {"success": False, "message": "Service unavailable. Please try again later."}


def _fallback_upload_file(
    file: BinaryIO, filename: str, tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Fallback for file upload
    
    Returns:
        Error response
    """
    return {
        "success": False,
        "message": "Unable to upload file to AI service at this time. The file has been stored locally and will be processed when the service is available.",
        "data": []
    }


def _fallback_list_files(*args, **kwargs) -> Dict[str, Any]:
    """
    Fallback for listing files
    
    Returns:
        Empty file list
    """
    return {
        "success": False,
        "message": "Unable to fetch files from AI service at this time.",
        "data": [],
        "count": 0
    }


def _fallback_get_file(file_id: str, *args, **kwargs) -> Dict[str, Any]:
    """
    Fallback for getting file details
    
    Returns:
        Error response
    """
    return {
        "success": False,
        "message": "Unable to fetch file details from AI service at this time.",
        "data": None
    }


def _fallback_delete_file(file_id: str, *args, **kwargs) -> Dict[str, Any]:
    """
    Fallback for deleting a file
    
    Returns:
        Error response
    """
    return {
        "success": False,
        "message": "Unable to delete file from AI service at this time. The operation will be retried later."
    }


def _fallback_chat_completion(
    messages: List[Dict[str, str]], *args, **kwargs
) -> Dict[str, Any]:
    """
    Fallback for chat completion
    
    Returns:
        Simple fallback response
    """
    return {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": "I'm sorry, but the AI service is currently unavailable. Your request has been saved and will be processed when the service is back online."
                }
            }
        ],
        "created": 0,
        "id": "fallback_response",
        "model": "fallback",
        "usage": [
            {
                "completion_tokens": 0,
                "prompt_tokens": 0,
                "total_tokens": 0
            }
        ]
    }