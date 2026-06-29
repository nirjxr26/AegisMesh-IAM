import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
import joblib
import os
import time
from sqlalchemy import create_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyDetector:
    def __init__(self, model_path="models/isolation_forest.joblib"):
        self.model_path = model_path
        self.categorical_features = ['action', 'category', 'result']
        self.numeric_features = ['duration']
        self.contamination = 0.05
        self.random_state = 42
        self.active_version = "unknown"
        self.db_url = os.getenv("DATABASE_URL")
        self._mlflow_initialized = False
        self.model = self._load_model()

    def _ensure_mlflow(self):
        if self._mlflow_initialized:
            return
        import mlflow
        self.mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")  # NOSONAR
        mlflow.set_tracking_uri(self.mlflow_uri)
        self.mlflow_client = mlflow.tracking.MlflowClient()
        try:
            mlflow.set_experiment("Security-Engine-Threat-Detection")
        except Exception as e:
            logger.warning("Could not initialize MLflow experiment: %s", e)
        self._mlflow_initialized = True

    def _sync_version_info(self):
        self._ensure_mlflow()
        try:
            versions = self.mlflow_client.get_latest_versions(
                "SecurityEnginePipeline", stages=["None", "Production"]
            )
            if versions:
                self.active_version = versions[0].version
                logger.info("Active model version synced: %s", self.active_version)
        except Exception as e:
            if "RESOURCE_DOES_NOT_EXIST" in str(e) or "not found" in str(e).lower():
                logger.info("No registered model version found in MLflow registry yet (model not yet trained).")
            else:
                logger.warning("Could not sync version info from MLflow: %s", e)

    def _load_model(self):
        if os.path.exists(self.model_path):
            logger.info("Loading existing model pipeline from %s", self.model_path)
            return joblib.load(self.model_path)
        return self._create_pipeline()

    def _create_pipeline(self):
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore'))
        ])
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numeric_features),
                ('cat', categorical_transformer, self.categorical_features)
            ])
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', IsolationForest(contamination=self.contamination, random_state=self.random_state))
        ], memory=None)

        dummy_df = pd.DataFrame([{
            'action': 'LOGIN',
            'category': 'AUTHENTICATION',
            'result': 'SUCCESS',
            'duration': 100.0
        }])
        pipeline.fit(dummy_df)

        return pipeline

    def train(self):
        if not self.db_url:
            logger.error("DATABASE_URL not set. Skipping training.")
            return

        self._ensure_mlflow()
        engine = create_engine(self.db_url)
        query = 'SELECT action, category, result, duration FROM "AuditLog" LIMIT 10000'
        df = pd.read_sql(query, engine)

        if df.empty:
            logger.warning("No data found for training.")
            return

        logger.info("Training Isolation Forest pipeline with MLflow tracking...")

        import mlflow
        import mlflow.sklearn

        with mlflow.start_run(run_name="IsolationForest_Training"):
            mlflow.log_param("contamination", self.contamination)
            mlflow.log_param("random_state", self.random_state)
            mlflow.log_param("data_count", len(df))

            self.model = self._create_pipeline()
            self.model.fit(df[self.categorical_features + self.numeric_features])

            scores = self.model.decision_function(df[self.categorical_features + self.numeric_features])
            mlflow.log_metric("mean_anomaly_score", float(np.mean(scores)))

            mlflow.sklearn.log_model(self.model, "model", registered_model_name="SecurityEnginePipeline")

            joblib.dump(self.model, self.model_path)
            self._sync_version_info()
            logger.info("Model pipeline saved and logged. Active version: %s", self.active_version)

    def predict_risk(self, data):
        if self.model is None:
            raise RuntimeError("Model not loaded. Call train() or load a model first.")

        try:
            if isinstance(data, dict):
                df = pd.DataFrame([data])
            else:
                df = pd.DataFrame(data)

            for col in self.categorical_features + self.numeric_features:
                if col not in df.columns:
                    df[col] = np.nan

            start_prep = time.time()
            preprocessor = self.model.named_steps['preprocessor']
            x_transformed = preprocessor.transform(df)
            prep_time = time.time() - start_prep

            start_inf = time.time()
            classifier = self.model.named_steps['classifier']
            scores = classifier.decision_function(x_transformed)
            inf_time = time.time() - start_inf

            risk_score = 1.0 - ((scores[0] + 0.5) / 1.0)
            return float(np.clip(risk_score, 0, 1)), prep_time, inf_time

        except Exception:
            logger.exception("Prediction error")
            raise
