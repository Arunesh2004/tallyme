import os

files = {
    # 1. Root Structure Additions
    ".github/ISSUE_TEMPLATE/bug_report.md": "name: Bug Report\\nabout: Create a report to help us improve",
    ".github/ISSUE_TEMPLATE/feature_request.md": "name: Feature Request\\nabout: Suggest an idea for this project",
    ".github/PULL_REQUEST_TEMPLATE.md": "## Description\\n\\n## Type of change\\n- [ ] Bug fix\\n- [ ] New feature\\n",
    ".github/CODEOWNERS": "* @tallyme/core-team",
    ".github/dependabot.yml": "version: 2\\nupdates:\\n  - package-ecosystem: 'npm'\\n    directory: '/'\\n    schedule:\\n      interval: 'weekly'",
    ".github/SECURITY.md": "# Security Policy\\n\\n## Supported Versions",
    ".github/FUNDING.yml": "github: tallyme",
    
    # 2. Backend Structure Additions
    "apps/api/app/lifespan.py": "from contextlib import asynccontextmanager\\nfrom fastapi import FastAPI\\n\\n@asynccontextmanager\\nasync def lifespan(app: FastAPI):\\n    yield",
    "apps/api/app/config/settings.py": "from pydantic_settings import BaseSettings\\n\\nclass Settings(BaseSettings):\\n    pass",
    "apps/api/app/config/constants.py": "API_V1_STR = '/api/v1'",
    "apps/api/app/config/environment.py": "ENV = 'development'",
    "apps/api/app/config/feature_flags.py": "FLAGS = {}",
    "apps/api/app/logging.py": "import logging\\nlogger = logging.getLogger(__name__)",
    
    # 4. Workspace Packages
    "packages/api-client/package.json": '{"name": "@tallyme/api-client", "version": "1.0.0"}',
    "packages/auth/package.json": '{"name": "@tallyme/auth", "version": "1.0.0"}',
    "packages/validation/package.json": '{"name": "@tallyme/validation", "version": "1.0.0"}',
    "packages/observability/package.json": '{"name": "@tallyme/observability", "version": "1.0.0"}',
    "packages/email/package.json": '{"name": "@tallyme/email", "version": "1.0.0"}',
    "packages/queue/package.json": '{"name": "@tallyme/queue", "version": "1.0.0"}',
    "packages/feature-flags/package.json": '{"name": "@tallyme/feature-flags", "version": "1.0.0"}',

    # 5. Advanced Docker Compose
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
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d tallyme"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped
    logging: *default-logging

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-admin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-password123}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - backend
    restart: unless-stopped

  mailpit:
    image: axllent/mailpit
    ports:
      - "8025:8025"
      - "1025:1025"
    networks:
      - backend
    restart: unless-stopped
    profiles:
      - full

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - frontend
      - backend
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    networks:
      - frontend
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - backend
    restart: unless-stopped

networks:
  frontend:
  backend:

volumes:
  pgdata:
  redisdata:
  miniodata:
""",

    # 6. Environment Files
    ".env.example": "# Global Env Example\\nENV=development",
    ".env.development": "# Local Dev Env\\nENV=development",
    ".env.test": "# Test Env\\nENV=test",
    ".env.production": "# Prod Env\\nENV=production",
    "apps/api/.env.example": "DATABASE_URL=postgresql://root:password@localhost:5432/tallyme",
    "apps/web/.env.example": "NEXT_PUBLIC_API_URL=http://localhost:8000",

    # 7. VSCode Tooling
    ".vscode/settings.json": '{\\n  "editor.formatOnSave": true,\\n  "python.formatting.provider": "black"\\n}',
    ".vscode/extensions.json": '{\\n  "recommendations": ["ms-python.python", "dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "ms-azuretools.vscode-docker", "bradlc.vscode-tailwindcss"]\\n}',
    ".vscode/launch.json": '{"version": "0.2.0", "configurations": []}',
    ".vscode/tasks.json": '{"version": "2.0.0", "tasks": []}',

    # 9. Repository Standards
    "README.md": """# TallyMe Platform

## Project Overview
TallyMe is a comprehensive platform.

## Architecture Diagram
(Diagram placeholder)

## Quick Start
1. `pnpm install`
2. `docker compose up -d`
3. `pnpm dev`

## Development Workflow
Trunk-based development.

## Branch Strategy
Branch from `main` using `feat/`, `fix/`, `chore/`.

## Directory Explanation
- `apps/`: Frontend and Backend apps.
- `packages/`: Shared libraries.

## Technology Stack
- Next.js 15
- FastAPI
- PostgreSQL
- Redis

## Commands
- `pnpm dev`: Start development.

## Troubleshooting
Refer to docs.
""",

    # 14. GitHub Actions (expanded)
    ".github/workflows/security.yml": "name: Security\\non: [push]\\njobs:\\n  scan:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo scan",
    ".github/workflows/dependency-audit.yml": "name: Dependency Audit\\non: [push]\\njobs:\\n  audit:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo audit",
    ".github/workflows/codeql.yml": "name: CodeQL\\non: [push]\\njobs:\\n  analyze:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo analyze",
    ".github/workflows/docker-build.yml": "name: Docker Build\\non: [push]\\njobs:\\n  build:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo build docker",
    ".github/workflows/preview.yml": "name: Preview\\non: [pull_request]\\njobs:\\n  preview:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo preview",
    ".github/workflows/documentation.yml": "name: Documentation\\non: [push]\\njobs:\\n  docs:\\n    runs-on: ubuntu-latest\\n    steps:\\n      - run: echo build docs",

    # 15. Code Quality
    ".husky/pre-commit": "npx lint-staged",
    "sonar-project.properties": "sonar.projectKey=tallyme\\nsonar.organization=tallyme"
}

dirs = [
    # 1. Root
    "infra", "docs", "scripts",
    
    # 2. Backend
    "apps/api/app/domain", "apps/api/app/application", "apps/api/app/infrastructure",
    "apps/api/app/dependencies", "apps/api/app/telemetry", "apps/api/app/security",
    "apps/api/app/validators", "apps/api/app/health",
    
    # 3. Frontend
    "apps/web/components/ui", "apps/web/components/layouts", "apps/web/components/navigation",
    "apps/web/components/dashboard", "apps/web/components/forms", "apps/web/components/tables",
    "apps/web/components/charts", "apps/web/components/icons", "apps/web/components/modals",
    "apps/web/components/drawers", "apps/web/components/notifications", "apps/web/components/skeletons",
    "apps/web/components/empty-states", "apps/web/components/error-boundaries",
    
    # 8. Documentation
    "docs/architecture", "docs/database", "docs/api", "docs/frontend", "docs/engineering",
    "docs/adr", "docs/decisions",
    
    # 10. Testing
    "apps/api/tests/unit", "apps/api/tests/integration", "apps/api/tests/e2e",
    "apps/api/tests/fixtures", "apps/api/tests/factories", "apps/api/tests/helpers",
    
    # 11. Observability
    "apps/api/app/telemetry/metrics", "apps/api/app/telemetry/logging", "apps/api/app/telemetry/tracing",
    
    # 12. Security
    "apps/api/app/security/jwt", "apps/api/app/security/permissions", "apps/api/app/security/audit",
    "apps/api/app/security/encryption"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '.gitkeep')
    with open(init_file, 'w') as f:
        pass

for path, content in files.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

# Add basic markdown files in docs
docs_files = [
    "docs/contributing.md", "docs/development.md", "docs/deployment.md", "docs/release.md"
]
for p in docs_files:
    with open(p, "w") as f:
        f.write(f"# {os.path.basename(p).replace('.md', '').capitalize()}\\n")

print("Expanded scaffolding complete.")
