ARG PYTHON_VERSION=3.13
FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Cache dependencies by copying only dependency files first
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy the rest of the application
COPY . .
