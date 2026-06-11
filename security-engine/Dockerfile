# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies using cache mount
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# Final Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 10001 securitygroup \
    && adduser --system --uid 10001 --gid 10001 securityuser

# Prevent Python from writing pyc files to read-only filesystem
ENV PYTHONDONTWRITEBYTECODE=1

# Copy installed dependencies and source code with read-only permissions
COPY --from=builder --chown=root:root --chmod=555 /install /usr/local
COPY --chown=root:root --chmod=555 src/ ./src/
COPY --chown=root:root --chmod=555 models/ ./models/

# Add HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

USER securityuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
