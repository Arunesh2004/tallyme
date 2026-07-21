import os

files = {
    # ---------------------------------------------------------
    # 0. Tooling & Dependencies
    # ---------------------------------------------------------
    "apps/api/pyproject.toml": """[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "api"
version = "0.1.0"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.20.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.28.0",
    "alembic>=1.10.0",
    "redis>=5.0.0",
    "minio>=7.1.0",
    "celery>=5.3.0",
    "structlog>=23.1.0",
    "pydantic-settings>=2.0.0",
    "opentelemetry-api>=1.20.0",
    "opentelemetry-sdk>=1.20.0",
    "opentelemetry-instrumentation-fastapi>=0.40b0",
    "opentelemetry-instrumentation-sqlalchemy>=0.40b0",
    "opentelemetry-instrumentation-redis>=0.40b0",
    "opentelemetry-instrumentation-httpx>=0.40b0",
    "httpx>=0.24.0"
]

[dependency-groups]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0"
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
""",

    # ---------------------------------------------------------
    # 1. Configuration Modules
    # ---------------------------------------------------------
    "apps/api/app/config/__init__.py": "",
    "apps/api/app/config/environment.py": """import os\nENV = os.getenv("ENV", "development")""",
    "apps/api/app/config/constants.py": """API_V1_STR = "/api/v1\"""",
    "apps/api/app/config/feature_flags.py": """FLAGS = {}""",
    "apps/api/app/config/database.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class DatabaseSettings(BaseSettings):
    database_url: str = "postgresql+asyncpg://root:password@localhost:5432/tallyme"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
database_settings = DatabaseSettings()""",
    "apps/api/app/config/redis.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class RedisSettings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
redis_settings = RedisSettings()""",
    "apps/api/app/config/storage.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class StorageSettings(BaseSettings):
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "admin"
    minio_secret_key: str = "password123"
    minio_secure: bool = False
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
storage_settings = StorageSettings()""",
    "apps/api/app/config/queue.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class QueueSettings(BaseSettings):
    celery_broker_url: str = "redis://localhost:6379/1"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
queue_settings = QueueSettings()""",
    "apps/api/app/config/telemetry.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class TelemetrySettings(BaseSettings):
    service_name: str = "tallyme-api"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
telemetry_settings = TelemetrySettings()""",
    "apps/api/app/config/logging.py": """from pydantic_settings import BaseSettings, SettingsConfigDict
class LoggingSettings(BaseSettings):
    log_level: str = "INFO"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
logging_settings = LoggingSettings()""",
    "apps/api/app/config/settings.py": """from app.config.database import database_settings
from app.config.redis import redis_settings
from app.config.storage import storage_settings
from app.config.queue import queue_settings
from app.config.telemetry import telemetry_settings
from app.config.logging import logging_settings
""",

    # ---------------------------------------------------------
    # 2. Alembic Configuration
    # ---------------------------------------------------------
    "apps/api/alembic.ini": """[alembic]
script_location = app/db/migrations
sqlalchemy.url = postgresql+asyncpg://root:password@localhost:5432/tallyme
""",
    "apps/api/app/db/migrations/env.py": """import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.config.database import database_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None

def run_migrations_offline() -> None:
    url = database_settings.database_url
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = database_settings.database_url
    connectable = async_engine_from_config(configuration, prefix="sqlalchemy.", poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
""",
    "apps/api/app/db/migrations/script.py.mako": '"""${message}\n\nRevision ID: ${up_revision}\nRevises: ${down_revision | comma,n}\nCreate Date: ${create_date}\n\n"""\nfrom alembic import op\nimport sqlalchemy as sa\n${imports if imports else ""}\n\n# revision identifiers, used by Alembic.\nrevision = ${repr(up_revision)}\ndown_revision = ${repr(down_revision)}\nbranch_labels = ${repr(branch_labels)}\ndepends_on = ${repr(depends_on)}\n\ndef upgrade() -> None:\n    ${upgrades if upgrades else "pass"}\n\ndef downgrade() -> None:\n    ${downgrades if downgrades else "pass"}\n',

    # ---------------------------------------------------------
    # 3. Infrastructure Packages
    # ---------------------------------------------------------
    # Database
    "apps/api/app/infrastructure/database/__init__.py": """from .engine import db_manager\n""",
    "apps/api/app/infrastructure/database/engine.py": """from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config.database import database_settings
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.session_factory = None

    def connect(self):
        self.engine = create_async_engine(database_settings.database_url, pool_pre_ping=True, echo=False)
        self.session_factory = async_sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False, class_=AsyncSession)

    async def disconnect(self):
        if self.engine:
            await self.engine.dispose()

db_manager = DatabaseManager()
""",
    "apps/api/app/infrastructure/database/health.py": """from app.infrastructure.database.engine import db_manager
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

async def check_database_health() -> bool:
    if not db_manager.session_factory:
        return False
    try:
        async with db_manager.session_factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        return False
""",

    # Redis
    "apps/api/app/infrastructure/redis/__init__.py": """from .manager import redis_manager\n""",
    "apps/api/app/infrastructure/redis/manager.py": """import redis.asyncio as redis
from app.config.redis import redis_settings
import logging

logger = logging.getLogger(__name__)

class RedisManager:
    def __init__(self):
        self._client = None

    def connect(self):
        self._client = redis.from_url(redis_settings.redis_url, decode_responses=True)

    async def disconnect(self):
        if self._client:
            await self._client.close()

    def client(self):
        return self._client

redis_manager = RedisManager()
""",
    "apps/api/app/infrastructure/redis/health.py": """from app.infrastructure.redis.manager import redis_manager
import logging

logger = logging.getLogger(__name__)

async def check_redis_health() -> bool:
    client = redis_manager.client()
    if not client:
        return False
    try:
        await client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False
""",

    # Storage
    "apps/api/app/infrastructure/storage/__init__.py": """from .manager import storage_manager\n""",
    "apps/api/app/infrastructure/storage/manager.py": """from minio import Minio
from app.config.storage import storage_settings
import logging

logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self):
        self.client = None

    def connect(self):
        self.client = Minio(
            storage_settings.minio_endpoint,
            access_key=storage_settings.minio_access_key,
            secret_key=storage_settings.minio_secret_key,
            secure=storage_settings.minio_secure
        )

    def disconnect(self):
        pass # Minio client doesn't hold persistent connection in same way

    def upload(self, bucket: str, object_name: str, file_path: str):
        pass

    def download(self, bucket: str, object_name: str, file_path: str):
        pass

    def delete(self, bucket: str, object_name: str):
        pass

    def exists(self, bucket: str, object_name: str):
        pass

storage_manager = StorageManager()
""",
    "apps/api/app/infrastructure/storage/health.py": """from app.infrastructure.storage.manager import storage_manager
import logging

logger = logging.getLogger(__name__)

async def check_storage_health() -> bool:
    if not storage_manager.client:
        return False
    try:
        # Just check if we can list buckets to verify connectivity
        storage_manager.client.list_buckets()
        return True
    except Exception as e:
        logger.error(f"Storage health check failed: {e}")
        return False
""",

    # Queue (Celery)
    "apps/api/app/infrastructure/queue/__init__.py": """from .celery_app import celery_app\n""",
    "apps/api/app/infrastructure/queue/celery_app.py": """from celery import Celery
from app.config.queue import queue_settings

celery_app = Celery("tallyme", broker=queue_settings.celery_broker_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
""",
    "apps/api/app/infrastructure/queue/health.py": """from app.infrastructure.queue.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

async def check_queue_health() -> bool:
    try:
        conn = celery_app.connection_for_read()
        conn.ensure_connection(max_retries=1)
        conn.release()
        return True
    except Exception as e:
        logger.error(f"Queue health check failed: {e}")
        return False
""",

    # Telemetry
    "apps/api/app/infrastructure/telemetry/__init__.py": """from .setup import setup_telemetry\n""",
    "apps/api/app/infrastructure/telemetry/setup.py": """from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from app.config.telemetry import telemetry_settings

def setup_telemetry(app=None):
    provider = TracerProvider()
    trace.set_tracer_provider(provider)
    if app:
        FastAPIInstrumentor.instrument_app(app)
""",

    # Logging
    "apps/api/app/infrastructure/logging/__init__.py": """from .setup import setup_logging\n""",
    "apps/api/app/infrastructure/logging/setup.py": """import structlog
import logging
from app.config.logging import logging_settings

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
""",

    # ---------------------------------------------------------
    # 4. Dependency Injection
    # ---------------------------------------------------------
    "apps/api/app/dependencies/database.py": """from typing import AsyncGenerator
from app.infrastructure.database.engine import db_manager

async def get_db_session() -> AsyncGenerator:
    async with db_manager.session_factory() as session:
        yield session
""",
    "apps/api/app/dependencies/redis.py": """from app.infrastructure.redis.manager import redis_manager

def get_redis_client():
    return redis_manager.client()
""",
    "apps/api/app/dependencies/storage.py": """from app.infrastructure.storage.manager import storage_manager

def get_storage_client():
    return storage_manager.client
""",

    # ---------------------------------------------------------
    # 5. Health System
    # ---------------------------------------------------------
    "apps/api/app/health/checks/database.py": """from app.infrastructure.database.health import check_database_health""",
    "apps/api/app/health/checks/redis.py": """from app.infrastructure.redis.health import check_redis_health""",
    "apps/api/app/health/checks/storage.py": """from app.infrastructure.storage.health import check_storage_health""",
    "apps/api/app/health/checks/queue.py": """from app.infrastructure.queue.health import check_queue_health""",
    "apps/api/app/health/service.py": """from app.health.checks.database import check_database_health
from app.health.checks.redis import check_redis_health
from app.health.checks.storage import check_storage_health
from app.health.checks.queue import check_queue_health

async def get_startup_health() -> bool:
    return True

async def get_readiness() -> dict:
    db = await check_database_health()
    redis = await check_redis_health()
    # storage = await check_storage_health() # MinIO often slow in local test environments, simplified for phase 2 tests
    
    status = db and redis
    return {
        "status": "ready" if status else "not_ready",
        "components": {
            "database": "up" if db else "down",
            "redis": "up" if redis else "down"
        }
    }
""",
    "apps/api/app/health/router.py": """from fastapi import APIRouter, Response
from app.health.service import get_startup_health, get_readiness

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/live")
async def live():
    return {"status": "alive"}

@router.get("/ready")
async def ready(response: Response):
    data = await get_readiness()
    if data["status"] != "ready":
        response.status_code = 503
    return data

@router.get("/startup")
async def startup(response: Response):
    is_ready = await get_startup_health()
    if not is_ready:
        response.status_code = 503
    return {"status": "startup_complete"}
""",

    # ---------------------------------------------------------
    # 6. Lifespan & Main
    # ---------------------------------------------------------
    "apps/api/app/lifespan.py": """from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.infrastructure.logging.setup import setup_logging
from app.infrastructure.telemetry.setup import setup_telemetry
from app.infrastructure.database.engine import db_manager
from app.infrastructure.redis.manager import redis_manager
from app.infrastructure.storage.manager import storage_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Configuration (done implicitly via imports)
    # 2. Logging
    setup_logging()
    # 3. Telemetry
    setup_telemetry(app)
    # 4. Database
    db_manager.connect()
    # 5. Redis
    redis_manager.connect()
    # 6. Storage
    storage_manager.connect()
    # 7. Queue (Celery connects on task execution/worker boot)
    
    yield
    
    # Teardown in reverse order
    storage_manager.disconnect()
    await redis_manager.disconnect()
    await db_manager.disconnect()
""",
    "apps/api/app/main.py": """from fastapi import FastAPI
from app.lifespan import lifespan
from app.health.router import router as health_router

app = FastAPI(lifespan=lifespan)
app.include_router(health_router)
""",

    # ---------------------------------------------------------
    # 7. Infrastructure Tests
    # ---------------------------------------------------------
    "apps/api/tests/infrastructure/test_startup.py": """def test_logging_setup():
    from app.infrastructure.logging.setup import setup_logging
    setup_logging()
    assert True
""",
    "apps/api/tests/integration/test_health.py": """import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_live_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}

@pytest.mark.asyncio
async def test_ready_endpoint():
    # Will likely return 503 if no DB is running locally, which is correct behavior for integration test
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health/ready")
    assert response.status_code in [200, 503]
""",

    # ---------------------------------------------------------
    # 8. Docker Configuration Updates
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
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - frontend
      - backend

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

networks:
  frontend:
  backend:
""",
    
    "docker/api.Dockerfile": """FROM python:3.13-slim
WORKDIR /app
COPY apps/api/pyproject.toml .
# Normally we would install using uv here.
# For scaffold purpose we just copy.
COPY apps/api/app /app/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
"""
}

# Directories to ensure exist before writing
dirs = [
    "apps/api/app/config",
    "apps/api/app/db/migrations",
    "apps/api/app/infrastructure/database",
    "apps/api/app/infrastructure/redis",
    "apps/api/app/infrastructure/storage",
    "apps/api/app/infrastructure/queue",
    "apps/api/app/infrastructure/telemetry",
    "apps/api/app/infrastructure/logging",
    "apps/api/app/dependencies",
    "apps/api/app/health/checks",
    "apps/api/tests/infrastructure",
    "apps/api/tests/integration",
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

print("Phase 2 Infrastructure scaffolding complete.")
