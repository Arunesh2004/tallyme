import os

files = {
    # ---------------------------------------------------------
    # 1. Container Implementation
    # ---------------------------------------------------------
    "apps/api/app/container/__init__.py": "",
    "apps/api/app/container/container.py": """class InfrastructureContainer:
    def __init__(self):
        self.db = None
        self.redis = None
        self.storage = None
        self.queue = None
        self.telemetry = None
        self.logger = None

container = InfrastructureContainer()
""",
    "apps/api/app/container/providers.py": """from app.container.container import container
from app.infrastructure.database.engine import DatabaseManager
from app.infrastructure.redis.manager import RedisManager
from app.infrastructure.storage.manager import StorageManager
from app.infrastructure.logging.setup import LoggingManager
from app.infrastructure.telemetry.setup import TelemetryManager

def init_providers():
    container.logger = LoggingManager()
    container.telemetry = TelemetryManager()
    container.db = DatabaseManager()
    container.redis = RedisManager()
    container.storage = StorageManager()
    # Queue is initialized separately by celery worker, but can be referenced here
""",
    "apps/api/app/container/startup.py": """from app.container.providers import init_providers
from app.container.container import container
from app.config.settings import load_settings

def startup_infrastructure():
    # 1. Configuration Validation (fail fast)
    load_settings()
    
    # 2. Initialize Providers
    init_providers()
    
    # 3. Boot sequence
    container.logger.setup()
    container.telemetry.setup()
    container.db.connect()
    container.redis.connect()
    container.storage.connect()
""",
    "apps/api/app/container/shutdown.py": """from app.container.container import container
import asyncio

async def shutdown_infrastructure():
    if container.storage:
        container.storage.disconnect()
    if container.redis:
        await container.redis.disconnect()
    if container.db:
        await container.db.disconnect()
""",

    # ---------------------------------------------------------
    # 2. Refactored Managers (Encapsulation)
    # ---------------------------------------------------------
    "apps/api/app/infrastructure/database/engine.py": """from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config.database import database_settings
from typing import AsyncGenerator
from contextlib import asynccontextmanager

class DatabaseManager:
    def __init__(self):
        self._engine = None
        self._session_factory = None

    def connect(self):
        if not database_settings.database_url:
            raise ValueError("DATABASE_URL is missing")
        self._engine = create_async_engine(database_settings.database_url, pool_pre_ping=True, echo=False)
        self._session_factory = async_sessionmaker(bind=self._engine, autoflush=False, expire_on_commit=False, class_=AsyncSession)

    async def disconnect(self):
        if self._engine:
            await self._engine.dispose()

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        if not self._session_factory:
            raise RuntimeError("Database not connected")
        async with self._session_factory() as session:
            yield session
""",
    "apps/api/app/infrastructure/redis/manager.py": """import redis.asyncio as redis
from app.config.redis import redis_settings

class RedisManager:
    def __init__(self):
        self._client = None

    def connect(self):
        if not redis_settings.redis_url:
            raise ValueError("REDIS_URL is missing")
        self._client = redis.from_url(redis_settings.redis_url, decode_responses=True)

    async def disconnect(self):
        if self._client:
            await self._client.close()

    def client(self):
        if not self._client:
            raise RuntimeError("Redis not connected")
        return self._client
""",
    "apps/api/app/infrastructure/storage/manager.py": """from minio import Minio
from app.config.storage import storage_settings

class StorageManager:
    def __init__(self):
        self._client = None

    def connect(self):
        if not storage_settings.minio_endpoint:
            raise ValueError("MINIO_ENDPOINT is missing")
        self._client = Minio(
            storage_settings.minio_endpoint,
            access_key=storage_settings.minio_access_key,
            secret_key=storage_settings.minio_secret_key,
            secure=storage_settings.minio_secure
        )

    def disconnect(self):
        self._client = None

    def upload(self, bucket: str, object_name: str, file_path: str):
        pass

    def download(self, bucket: str, object_name: str, file_path: str):
        pass

    def delete(self, bucket: str, object_name: str):
        pass

    def exists(self, bucket: str, object_name: str):
        pass
        
    def presigned_url(self, bucket: str, object_name: str):
        pass
""",

    # ---------------------------------------------------------
    # 3. Telemetry & Logging
    # ---------------------------------------------------------
    "apps/api/app/infrastructure/telemetry/setup.py": """from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from app.config.telemetry import telemetry_settings
from app.config.environment import ENV

class TelemetryManager:
    def setup(self):
        if not telemetry_settings.service_name:
            raise ValueError("TELEMETRY_SERVICE_NAME is missing")
        resource = Resource.create({
            "service.name": telemetry_settings.service_name,
            "service.version": telemetry_settings.service_version,
            "deployment.environment": ENV,
            "vcs.revision": telemetry_settings.commit_sha
        })
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)
""",
    "apps/api/app/infrastructure/logging/setup.py": """import structlog
from app.config.logging import logging_settings
from app.config.environment import ENV
from app.config.telemetry import telemetry_settings

class LoggingManager:
    def setup(self):
        structlog.configure(
            processors=[
                structlog.stdlib.add_log_level,
                structlog.stdlib.add_logger_name,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.contextvars.merge_contextvars,
                self._add_global_context,
                structlog.processors.JSONRenderer()
            ],
            logger_factory=structlog.stdlib.LoggerFactory(),
        )

    def _add_global_context(self, logger, method_name, event_dict):
        event_dict["environment"] = ENV
        event_dict["service"] = telemetry_settings.service_name
        event_dict["application_version"] = telemetry_settings.service_version
        return event_dict
""",

    # ---------------------------------------------------------
    # 4. Standardized Health System
    # ---------------------------------------------------------
    "apps/api/app/health/schema.py": """from typing import Any, Dict
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    service: str
    latency_ms: float
    checked_at: str
    details: Dict[str, Any]
""",
    "apps/api/app/health/checks/database.py": """from app.container.container import container
from sqlalchemy import text
import time
from datetime import datetime
from app.health.schema import HealthResponse

async def check_database_health() -> HealthResponse:
    start = time.perf_counter()
    status = "healthy"
    details = {}
    try:
        if container.db:
            async with container.db.session() as session:
                await session.execute(text("SELECT 1"))
        else:
            status = "unhealthy"
            details = {"error": "DB not initialized"}
    except Exception as e:
        status = "unhealthy"
        details = {"error": str(e)}
    
    latency = (time.perf_counter() - start) * 1000
    return HealthResponse(
        status=status,
        service="database",
        latency_ms=latency,
        checked_at=datetime.utcnow().isoformat(),
        details=details
    )
""",
    "apps/api/app/health/checks/redis.py": """from app.container.container import container
import time
from datetime import datetime
from app.health.schema import HealthResponse

async def check_redis_health() -> HealthResponse:
    start = time.perf_counter()
    status = "healthy"
    details = {}
    try:
        if container.redis:
            await container.redis.client().ping()
        else:
            status = "unhealthy"
            details = {"error": "Redis not initialized"}
    except Exception as e:
        status = "unhealthy"
        details = {"error": str(e)}
    
    latency = (time.perf_counter() - start) * 1000
    return HealthResponse(
        status=status,
        service="redis",
        latency_ms=latency,
        checked_at=datetime.utcnow().isoformat(),
        details=details
    )
""",
    "apps/api/app/health/checks/storage.py": """from app.container.container import container
import time
from datetime import datetime
from app.health.schema import HealthResponse

async def check_storage_health() -> HealthResponse:
    start = time.perf_counter()
    status = "healthy"
    details = {}
    try:
        if container.storage and container.storage._client:
            container.storage._client.list_buckets()
        else:
            status = "unhealthy"
            details = {"error": "Storage not initialized"}
    except Exception as e:
        status = "unhealthy"
        details = {"error": str(e)}
    
    latency = (time.perf_counter() - start) * 1000
    return HealthResponse(
        status=status,
        service="storage",
        latency_ms=latency,
        checked_at=datetime.utcnow().isoformat(),
        details=details
    )
""",
    "apps/api/app/health/router.py": """from fastapi import APIRouter, Response
from app.health.checks.database import check_database_health
from app.health.checks.redis import check_redis_health
from app.health.checks.storage import check_storage_health

router = APIRouter(tags=["observability"])

@router.get("/liveness")
async def liveness():
    return {"status": "alive"}

@router.get("/readiness")
async def readiness(response: Response):
    db_h = await check_database_health()
    redis_h = await check_redis_health()
    storage_h = await check_storage_health()
    
    components = [db_h, redis_h, storage_h]
    if any(c.status != "healthy" for c in components):
        response.status_code = 503
        
    return {
        "status": "ready" if response.status_code == 200 else "not_ready",
        "components": [c.model_dump() for c in components]
    }

@router.get("/metrics")
async def metrics():
    # Placeholder for Prometheus metrics
    return {"metrics": "ok"}
""",

    # ---------------------------------------------------------
    # 5. Config Fail-Fast & Dependencies
    # ---------------------------------------------------------
    "apps/api/app/config/telemetry.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class TelemetrySettings(BaseSettings):
    service_name: str = "tallyme-api"
    service_version: str = "1.0.0"
    commit_sha: str = "dev"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
telemetry_settings = TelemetrySettings()""",

    "apps/api/app/config/settings.py": """from app.config.database import database_settings
from app.config.redis import redis_settings
from app.config.storage import storage_settings
from app.config.queue import queue_settings
from app.config.telemetry import telemetry_settings
from app.config.logging import logging_settings

def load_settings():
    # By simply accessing these, Pydantic throws ValidationError if missing
    _ = database_settings.database_url
    _ = redis_settings.redis_url
    _ = storage_settings.minio_endpoint
    _ = queue_settings.celery_broker_url
    _ = telemetry_settings.service_name
""",

    # ---------------------------------------------------------
    # 6. FastAPI Decoupling
    # ---------------------------------------------------------
    "apps/api/app/lifespan.py": """from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.container.startup import startup_infrastructure
from app.container.shutdown import shutdown_infrastructure
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pure container boot
    startup_infrastructure()
    
    # Specific FastAPI bindings post-boot
    FastAPIInstrumentor.instrument_app(app)
    
    yield
    
    await shutdown_infrastructure()
""",
    "apps/api/app/main.py": """from fastapi import FastAPI
from app.lifespan import lifespan
from app.health.router import router as health_router

app = FastAPI(lifespan=lifespan)
app.include_router(health_router)
""",

    # ---------------------------------------------------------
    # 7. Testing
    # ---------------------------------------------------------
    "apps/api/tests/infrastructure/test_failures.py": """import pytest
import os
from app.container.startup import startup_infrastructure

def test_startup_fails_without_db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    with pytest.raises(Exception):
        startup_infrastructure()
""",

    # ---------------------------------------------------------
    # 8. Docker Profiles
    # ---------------------------------------------------------
    "docker-compose.yml": """version: '3.8'
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${DB_USER:-root}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-tallyme}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d tallyme"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    profiles: ["development", "testing", "production"]

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    profiles: ["development", "testing", "production"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-admin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-password123}
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - backend
    profiles: ["development", "testing", "production"]

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/liveness"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - frontend
      - backend
    profiles: ["development", "production"]

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    healthcheck:
      test: ["CMD", "echo", "web alive"] # placeholder
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - frontend
    profiles: ["development", "production"]

  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "echo", "worker alive"] # placeholder
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    profiles: ["development", "production"]

networks:
  frontend:
  backend:
"""
}

# Directories to ensure exist before writing
dirs = [
    "apps/api/app/container",
    "apps/api/app/health/checks",
    "apps/api/app/infrastructure/database",
    "apps/api/app/infrastructure/redis",
    "apps/api/app/infrastructure/storage",
    "apps/api/app/infrastructure/telemetry",
    "apps/api/app/infrastructure/logging",
    "apps/api/tests/infrastructure",
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '__init__.py')
    with open(init_file, 'w') as f:
        pass

for path, content in files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

print("Phase 2 Hardening scaffolding complete.")
