import pytest
import numpy as np
from src.anomaly_detector import AnomalyDetector


class TestAnomalyDetector:
    def test_init_creates_default_pipeline(self):
        detector = AnomalyDetector()
        assert detector.model is not None
        assert detector.active_version == "unknown"
        assert detector._mlflow_initialized is False

    def test_predict_risk_with_valid_data(self):
        detector = AnomalyDetector()
        data = {
            "action": "LOGIN",
            "category": "AUTHENTICATION",
            "result": "SUCCESS",
            "duration": 100.0
        }
        risk_score, _, _ = detector.predict_risk(data)
        assert 0.0 <= risk_score <= 1.0

    def test_predict_risk_with_missing_columns(self):
        detector = AnomalyDetector()
        data = {"action": "LOGIN"}
        risk_score, _, _ = detector.predict_risk(data)
        assert 0.0 <= risk_score <= 1.0

    def test_predict_risk_with_empty_dict(self):
        detector = AnomalyDetector()
        risk_score, _, _ = detector.predict_risk({})
        assert 0.0 <= risk_score <= 1.0

    def test_predict_risk_raises_on_invalid_data(self):
        detector = AnomalyDetector()
        with pytest.raises(Exception):
            detector.predict_risk(None)

    def test_model_uses_isolation_forest(self):
        detector = AnomalyDetector()
        from sklearn.ensemble import IsolationForest
        classifier = detector.model.named_steps['classifier']
        assert isinstance(classifier, IsolationForest)
        assert classifier.contamination == pytest.approx(0.05)

    def test_risk_score_bounds(self):
        detector = AnomalyDetector()
        for _ in range(10):
            risk_score, _, _ = detector.predict_risk({
                "action": "LOGIN",
                "category": "AUTHENTICATION",
                "result": "SUCCESS",
                "duration": 100.0
            })
            assert 0.0 <= risk_score <= 1.0

    def test_pipeline_structure(self):
        detector = AnomalyDetector()
        assert 'preprocessor' in detector.model.named_steps
        assert 'classifier' in detector.model.named_steps
