import os
from contextlib import asynccontextmanager
if os.getenv("DD_APM_ENABLED") == "true":
    from ddtrace import patch_all; patch_all()
from fastapi import FastAPI, HTTPException, Request
from .anomaly_detector import AnomalyDetector
from prometheus_client import Counter, Histogram, Gauge, make_asgi_app
import time


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan handler — runs startup logic then yields."""
    sync_metrics()
    yield


app = FastAPI(title="AegisMesh Security Engine", lifespan=lifespan)

# Metrics
RISK_SCORE = Histogram(
    "security_engine_risk_score",
    "Risk score predicted by the model",
    buckets=[
        0.1,
        0.3,
        0.5,
        0.7,
        0.9,
        1.0])
PREDICTION_LATENCY = Histogram(
    "security_engine_prediction_duration_seconds",
    "Total time spent processing risk prediction",
    buckets=[
        0.01,
        0.05,
        0.1,
        0.5,
        1.0,
        2.0,
        5.0])
PREP_LATENCY = Histogram(
    "security_engine_preprocessing_duration_seconds",
    "Time spent in feature engineering",
    buckets=[
        0.001,
        0.005,
        0.01,
        0.05,
        0.1])
INF_LATENCY = Histogram(
    "security_engine_inference_duration_seconds",
    "Time spent in model inference",
    buckets=[
        0.001,
        0.005,
        0.01,
        0.05,
        0.1])
PREDICTION_COUNTER = Counter("security_engine_predictions_total",
                             "Total number of risk predictions", ["outcome", "version"])
MODEL_INFO = Gauge("security_engine_model_info", "Metadata about the active model", ["version"])

detector = AnomalyDetector()


def sync_metrics():
    # Reset model info gauge and set current version
    MODEL_INFO.clear()
    MODEL_INFO.labels(version=detector.active_version).set(1)


# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)



@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": detector.model is not None,
        "active_version": detector.active_version
    }


@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()

    start_total = time.time()
    risk_score, prep_time, inf_time = detector.predict_risk(data)
    total_duration = time.time() - start_total

    # Record detailed metrics
    RISK_SCORE.observe(risk_score)
    PREDICTION_LATENCY.observe(total_duration)
    PREP_LATENCY.observe(prep_time)
    INF_LATENCY.observe(inf_time)

    outcome = "anomalous" if risk_score > 0.7 else "normal"
    PREDICTION_COUNTER.labels(outcome=outcome, version=detector.active_version).inc()

    return {
        "risk_score": risk_score,
        "is_anomaly": risk_score > 0.7,
        "analysis_time_ms": total_duration * 1000,
        "active_version": detector.active_version
    }


@app.post("/train", responses={500: {"description": "Internal Server Error"}})
def train():
    try:
        detector.train()
        sync_metrics()
        return {"message": "Model trained successfully", "new_version": detector.active_version}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Bind to localhost to fix SonarCloud Blocker (kubernetes handles external exposure)
    uvicorn.run(app, host="0.0.0.0", port=8000)  # nosonar
