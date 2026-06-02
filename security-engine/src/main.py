from fastapi import FastAPI, HTTPException, Request
from .anomaly_detector import AnomalyDetector
from prometheus_client import Counter, Histogram, make_asgi_app
import os
import time

app = FastAPI(title="AegisMesh Security Engine")

# Metrics
RISK_SCORE = Histogram("security_engine_risk_score", "Risk score predicted by the model", buckets=[0.1, 0.3, 0.5, 0.7, 0.9, 1.0])
PREDICTION_COUNTER = Counter("security_engine_predictions_total", "Total number of risk predictions", ["outcome"])

detector = AnomalyDetector()

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": detector.model is not None}

@app.post("/analyze")
async def analyze(request: Request):
    data = await request.json()
    
    start_time = time.time()
    # Mocking prediction logic for the prototype
    # In production, we'd transform 'data' to match the training set features
    risk_score = detector.predict_risk(data)
    
    duration = time.time() - start_time
    RISK_SCORE.observe(risk_score)
    
    outcome = "anomalous" if risk_score > 0.7 else "normal"
    PREDICTION_COUNTER.labels(outcome=outcome).inc()
    
    return {
        "risk_score": risk_score,
        "is_anomaly": risk_score > 0.7,
        "analysis_time_ms": duration * 1000
    }

@app.post("/train")
def train():
    try:
        detector.train()
        return {"message": "Model trained successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
