# In PowerShell
Set-Content -Path "shared/shared/__init__.py" -Value @"
"""
Pulse360 Shared Core Package.

This package contains shared functionality used by all Pulse360 modules:
- Authentication
- Database models
- API interfaces
- Flux AI integration
- Utilities
"""

__version__ = "0.1.0"

from .main import setup_shared

__all__ = ["setup_shared"]
"@