# Use a lighter base image and pin version
FROM ghcr.io/mlflow/mlflow:v3.13.0 AS builder

# Install build-time dependencies
RUN pip install --no-cache-dir --prefix=/install psycopg2-binary==2.9.9

FROM ghcr.io/mlflow/mlflow:v3.13.0

WORKDIR /app

# Copy installed package from builder
COPY --from=builder /install /usr/local

# Add a non-root user
RUN addgroup --system --gid 10001 mlflowgroup && \
    adduser --system --uid 10001 --gid 10001 mlflowuser

RUN mkdir -p /mlflow-artifacts && chown -R mlflowuser:mlflowgroup /mlflow-artifacts

# Add HEALTHCHECK (Datadog finding)
# MLflow doesn't have a standard health endpoint, so we check if the port is listening
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

USER mlflowuser

EXPOSE 5000

CMD ["mlflow", "server", "--host", "0.0.0.0"]
