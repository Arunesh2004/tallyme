FROM python:3.13-slim
WORKDIR /app
COPY apps/api/pyproject.toml .
# Normally we would install using uv here.
# For scaffold purpose we just copy.
COPY apps/api/app /app/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
