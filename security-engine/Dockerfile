FROM python:3.11-slim

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 10001 securitygroup && \
    adduser --system --uid 10001 --gid 10001 securityuser

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only necessary directories as root to ensure they are NOT writable by the app user
COPY src/ ./src/
COPY models/ ./models/

# Explicitly remove write permissions (Security Hardening)
RUN chmod -R 555 ./src ./models

# Switch to non-root user
USER securityuser

EXPOSE 8000

# Explicitly bind to 0.0.0.0 here since it's containerized and needs to accept traffic from the K8s service, but the application code itself shouldn't hardcode it.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
