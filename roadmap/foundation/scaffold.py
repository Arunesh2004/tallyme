import os
import textwrap

scaffold = {
    # Root
    "README.md": "# TallyMe Platform\n\nMonorepo for the TallyMe Platform.",
    "LICENSE": "MIT License",
    ".editorconfig": """root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ncharset = utf-8\ntrim_trailing_whitespace = true\ninsert_final_newline = true""",
    ".gitignore": """node_modules\n.next\ndist\nbuild\ncoverage\n.env\n.env.local\n.venv\n__pycache__\n*.pyc\n.pytest_cache\n.turbo""",
    ".gitattributes": "* text=auto eol=lf",
    ".prettierrc": """{\n  "semi": true,\n  "singleQuote": true,\n  "trailingComma": "all"\n}""",
    ".prettierignore": """node_modules\n.next\ndist\nbuild\n.venv""",
    ".eslintrc": """{\n  "root": true,\n  "extends": ["eslint:recommended"]\n}""",
    "lint-staged.config.js": "module.exports = { '*.{js,ts,tsx,json,md}': 'prettier --write' };",
    "commitlint.config.js": "module.exports = { extends: ['@commitlint/config-conventional'] };",
    "turbo.json": """{\n  "$schema": "https://turbo.build/schema.json",\n  "tasks": {\n    "build": {\n      "dependsOn": ["^build"],\n      "outputs": [".next/**", "dist/**"]\n    },\n    "lint": {},\n    "typecheck": {},\n    "test": {},\n    "dev": {\n      "cache": false,\n      "persistent": true\n    }\n  }\n}""",
    "pnpm-workspace.yaml": "packages:\n  - 'apps/*'\n  - 'packages/*'",
    "package.json": """{\n  "name": "tallyme-workspace",\n  "version": "1.0.0",\n  "private": true,\n  "scripts": {\n    "build": "turbo run build",\n    "dev": "turbo run dev",\n    "lint": "turbo run lint",\n    "typecheck": "turbo run typecheck",\n    "test": "turbo run test"\n  },\n  "devDependencies": {\n    "turbo": "^2.0.0",\n    "prettier": "^3.0.0",\n    "typescript": "^5.0.0"\n  },\n  "packageManager": "pnpm@9.5.0"\n}""",

    # GitHub Actions
    ".github/workflows/ci.yml": """name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "CI placeholder\"""",
    ".github/workflows/quality.yml": """name: Quality\non: [push]\njobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "Quality placeholder\"""",
    ".github/workflows/release.yml": """name: Release\non: [tag]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "Release placeholder\"""",

    # Docker
    "docker/web.Dockerfile": "FROM node:20-alpine\nCMD [\"echo\", \"Web Dockerfile placeholder\"]",
    "docker/api.Dockerfile": "FROM python:3.13-slim\nCMD [\"echo\", \"API Dockerfile placeholder\"]",
    "docker/worker.Dockerfile": "FROM python:3.13-slim\nCMD [\"echo\", \"Worker Dockerfile placeholder\"]",
    "docker-compose.yml": """version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: password
      POSTGRES_DB: tallyme
    ports:
      - "5432:5432"
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  minio:
    image: minio/minio
    command: server /data
    ports:
      - "9000:9000"
      - "9001:9001"
  mailpit:
    image: axllent/mailpit
    ports:
      - "8025:8025"
      - "1025:1025"
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
""",

    # Packages
    "packages/ui/package.json": """{"name": "@tallyme/ui", "version": "1.0.0", "scripts": {"lint": "echo UI Lint"}}""",
    "packages/types/package.json": """{"name": "@tallyme/types", "version": "1.0.0"}""",
    "packages/config/package.json": """{"name": "@tallyme/config", "version": "1.0.0"}""",
    "packages/eslint-config/package.json": """{"name": "@tallyme/eslint-config", "version": "1.0.0"}""",
    "packages/tsconfig/package.json": """{"name": "@tallyme/tsconfig", "version": "1.0.0"}""",
    "packages/shared/package.json": """{"name": "@tallyme/shared", "version": "1.0.0"}""",
    "packages/database/package.json": """{"name": "@tallyme/database", "version": "1.0.0", "scripts": {"build": "prisma generate"}}""",
    "packages/database/prisma/schema.prisma": """datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\ngenerator client {\n  provider = "prisma-client-js"\n}""",

    # Apps - Web
    "apps/web/package.json": """{"name": "web", "version": "1.0.0", "scripts": {"dev": "next dev", "build": "next build", "lint": "next lint", "typecheck": "tsc --noEmit", "test": "echo web test"}}""",
    "apps/web/app/page.tsx": "export default function Page() { return <div>TallyMe</div>; }",
    "apps/web/app/layout.tsx": "export default function Layout({ children }: { children: React.ReactNode }) { return (<html><body>{children}</body></html>); }",
    
    # Apps - API
    "apps/api/pyproject.toml": """[project]
name = "api"
version = "0.1.0"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.20.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.10.0",
    "pydantic>=2.0.0"
]
""",
    "apps/api/app/main.py": "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef health_check():\n    return {'status': 'ok'}\n"
}

# Directories for frontend structure
web_dirs = [
    "apps/web/app", "apps/web/components", "apps/web/features", "apps/web/hooks",
    "apps/web/lib", "apps/web/providers", "apps/web/services", "apps/web/styles",
    "apps/web/types", "apps/web/utils", "apps/web/assets", "apps/web/public"
]

# Directories for backend structure
api_dirs = [
    "apps/api/app/api", "apps/api/app/core", "apps/api/app/config", "apps/api/app/db",
    "apps/api/app/models", "apps/api/app/schemas", "apps/api/app/repositories",
    "apps/api/app/services", "apps/api/app/middleware", "apps/api/app/workers",
    "apps/api/app/tasks", "apps/api/app/events", "apps/api/app/exceptions",
    "apps/api/app/utils", "apps/api/tests"
]

for d in web_dirs + api_dirs:
    os.makedirs(d, exist_ok=True)
    init_file = os.path.join(d, '.gitkeep')
    with open(init_file, 'w') as f:
        pass

for path, content in scaffold.items():
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

print("Scaffolding complete.")
