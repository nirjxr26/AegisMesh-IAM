import pytest
from fastapi.testclient import TestClient
from src.main import app


class TestHealth:
    def test_health_returns_status(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "model_loaded" in data
        assert "active_version" in data


class TestAnalyze:
    def test_analyze_with_valid_data(self):
        client = TestClient(app)
        data = {
            "action": "LOGIN",
            "category": "AUTHENTICATION",
            "result": "SUCCESS",
            "duration": 100.0
        }
        response = client.post("/analyze", json=data)
        assert response.status_code == 200
        result = response.json()
        assert "risk_score" in result
        assert "is_anomaly" in result
        assert "analysis_time_ms" in result
        assert 0.0 <= result["risk_score"] <= 1.0
        assert isinstance(result["is_anomaly"], bool)

    def test_analyze_with_partial_data(self):
        client = TestClient(app)
        response = client.post("/analyze", json={"action": "LOGIN"})
        assert response.status_code == 200

    def test_analyze_with_empty_body(self):
        client = TestClient(app)
        response = client.post("/analyze", json={})
        assert response.status_code == 200
        result = response.json()
        assert 0.0 <= result["risk_score"] <= 1.0


class TestTrain:
    def test_train_endpoint_returns_200(self):
        client = TestClient(app)
        response = client.post("/train")
        assert response.status_code == 200
