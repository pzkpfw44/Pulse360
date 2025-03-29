"""
Storage utilities for file handling.
"""
import os
from typing import BinaryIO, Optional

from loguru import logger
from minio import Minio
from minio.error import S3Error

class StorageClient:
    """
    Client for interacting with object storage.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """
        Singleton pattern to ensure only one storage client instance.
        """
        if cls._instance is None:
            cls._instance = super(StorageClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(
        self,
        minio_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: bool = False
    ):
        """
        Initialize the storage client.
        
        Args:
            minio_url: The MinIO URL. If not provided, will be read from environment.
            access_key: The MinIO access key. If not provided, will be read from environment.
            secret_key: The MinIO secret key. If not provided, will be read from environment.
            secure: Whether to use SSL.
        """
        # Skip initialization if already initialized
        if self._initialized:
            return
            
        # Get configuration from environment if not provided
        self.minio_url = minio_url or os.getenv("MINIO_URL", "localhost:9000")
        self.access_key = access_key or os.getenv("MINIO_ACCESS_KEY", "pulse360")
        self.secret_key = secret_key or os.getenv("MINIO_SECRET_KEY", "pulse360password")
        
        # Remove http:// or https:// from URL if present
        if self.minio_url.startswith("http://"):
            self.minio_url = self.minio_url[7:]
            secure = False
        elif self.minio_url.startswith("https://"):
            self.minio_url = self.minio_url[8:]
            secure = True
            
        # Create MinIO client
        self.client = Minio(
            self.minio_url,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=secure
        )
        
        self._initialized = True
        
        logger.info(f"Storage client initialized with URL: {self.minio_url}")
        
    def ensure_bucket_exists(self, bucket_name: str) -> None:
        """
        Ensure a bucket exists, creating it if it doesn't.
        
        Args:
            bucket_name: The name of the bucket.
        """
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise
            
    def upload_file(
        self,
        bucket_name: str,
        object_name: str,
        file_data: BinaryIO,
        content_type: Optional[str] = None
    ) -> str:
        """
        Upload a file to storage.
        
        Args:
            bucket_name: The name of the bucket.
            object_name: The name of the object.
            file_data: The file data.
            content_type: The content type of the file.
            
        Returns:
            str: The object URL.
        """
        # Ensure bucket exists
        self.ensure_bucket_exists(bucket_name)
        
        try:
            # Upload file
            self.client.put_object(
                bucket_name,
                object_name,
                file_data,
                length=-1,  # Auto-determine length
                content_type=content_type
            )
            
            logger.info(f"Uploaded file: {bucket_name}/{object_name}")
            
            # Generate URL
            url = f"/storage/{bucket_name}/{object_name}"
            return url
            
        except S3Error as e:
            logger.error(f"Error uploading file: {e}")
            raise
            
    def download_file(self, bucket_name: str, object_name: str) -> bytes:
        """
        Download a file from storage.
        
        Args:
            bucket_name: The name of the bucket.
            object_name: The name of the object.
            
        Returns:
            bytes: The file data.
        """
        try:
            # Download file
            response = self.client.get_object(bucket_name, object_name)
            data = response.read()
            response.close()
            
            logger.info(f"Downloaded file: {bucket_name}/{object_name}")
            
            return data
            
        except S3Error as e:
            logger.error(f"Error downloading file: {e}")
            raise
            
    def get_file_url(self, bucket_name: str, object_name: str) -> str:
        """
        Get the URL for a file.
        
        Args:
            bucket_name: The name of the bucket.
            object_name: The name of the object.
            
        Returns:
            str: The file URL.
        """
        return f"/storage/{bucket_name}/{object_name}"
        
    def delete_file(self, bucket_name: str, object_name: str) -> None:
        """
        Delete a file from storage.
        
        Args:
            bucket_name: The name of the bucket.
            object_name: The name of the object.
        """
        try:
            # Delete file
            self.client.remove_object(bucket_name, object_name)
            
            logger.info(f"Deleted file: {bucket_name}/{object_name}")
            
        except S3Error as e:
            logger.error(f"Error deleting file: {e}")
            raise


# Create global storage client instance
storage_client = StorageClient()