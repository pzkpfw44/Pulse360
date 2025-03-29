from setuptools import setup, find_packages

setup(
    name="pulse360-shared",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.100.0",
        "uvicorn>=0.23.0",
        "pydantic>=2.0.0",
        "sqlalchemy>=2.0.0",
        "python-jose>=3.3.0",
        "passlib>=1.7.4",
        "httpx>=0.24.1",
        "redis>=4.6.0",
    ],
)