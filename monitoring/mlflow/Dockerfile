FROM ghcr.io/mlflow/mlflow:v3.13.0

RUN pip install psycopg2-binary

# Create a non-root user
RUN addgroup --system --gid 10001 mlflowgroup && \
    adduser --system --uid 10001 --gid 10001 mlflowuser

# Ensure the default artifact directory exists and is owned by the new user
RUN mkdir -p /mlflow-artifacts && chown -R mlflowuser:mlflowgroup /mlflow-artifacts

USER mlflowuser

# Ensure the server is listening on the correct interface
CMD ["mlflow", "server", "--host", "0.0.0.0", "--port", "5000"]
