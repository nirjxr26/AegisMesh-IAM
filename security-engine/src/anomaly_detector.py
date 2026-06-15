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
import mlflow
import mlflow.sklearn
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

        # MLflow Setup
        self.mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000") # nosonar
        mlflow.set_tracking_uri(self.mlflow_uri)
        self.mlflow_client = mlflow.tracking.MlflowClient()
        
        try:
            mlflow.set_experiment("Security-Engine-Threat-Detection")
        except Exception as e:
            logger.warning(f"Could not initialize MLflow experiment: {e}")

        self.model = self._load_model()
        self.db_url = os.getenv("DATABASE_URL")
        self._sync_version_info()

    def _sync_version_info(self):
        """Fetch the latest version from the MLflow registry"""
        try:
            versions = self.mlflow_client.get_latest_versions("SecurityEnginePipeline", stages=["None", "Production"])
            if versions:
                self.active_version = versions[0].version
                logger.info(f"Active model version synced: {self.active_version}")
        except Exception:
            logger.exception("Could not sync version info from MLflow")

    def _load_model(self):
        if os.path.exists(self.model_path):
            logger.info(f"Loading existing model pipeline from {self.model_path}")
            return joblib.load(self.model_path)

        # Initialize a default pipeline if no model exists
        return self._create_pipeline()

    def _create_pipeline(self):
        # Preprocessing for categorical data
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore'))
        ])

        # Preprocessing for numeric data
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])

        # Combine preprocessing steps
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, self.numeric_features),
                ('cat', categorical_transformer, self.categorical_features)
            ])

        # Create the full pipeline
        return Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', IsolationForest(contamination=self.contamination, random_state=self.random_state))
        ])

    def train(self):
        if not self.db_url:
            logger.error("DATABASE_URL not set. Skipping training.")
            return

        engine = create_engine(self.db_url)
        # Fetch audit logs for training
        query = "SELECT action, category, result, duration FROM \"AuditLog\" LIMIT 10000"
        df = pd.read_sql(query, engine)

        if df.empty:
            logger.warning("No data found for training.")
            return

        logger.info("Training Isolation Forest pipeline with MLflow tracking...")

        with mlflow.start_run(run_name="IsolationForest_Training"):
            # Log hyperparameters
            mlflow.log_param("contamination", self.contamination)
            mlflow.log_param("random_state", self.random_state)
            mlflow.log_param("data_count", len(df))

            # New pipeline handles encoding and scaling internally
            self.model = self._create_pipeline()
            self.model.fit(df[self.categorical_features + self.numeric_features])

            # Calculate and log an internal metric for visibility
            scores = self.model.decision_function(df[self.categorical_features + self.numeric_features])
            mlflow.log_metric("mean_anomaly_score", float(np.mean(scores)))

            # Log model to MLflow
            mlflow.sklearn.log_model(self.model, "model", registered_model_name="SecurityEnginePipeline")

            # Save the entire pipeline locally
            joblib.dump(self.model, self.model_path)
            self._sync_version_info()
            logger.info(f"Model pipeline saved and logged. Active version: {self.active_version}")

    def predict_risk(self, data):
        """
        Predicts if a given action is anomalous.
        Returns (risk_score, preprocessing_time, inference_time)
        """
        if self.model is None:
            return 0.5, 0.0, 0.0

        try:
            # Convert single observation to DataFrame
            if isinstance(data, dict):
                df = pd.DataFrame([data])
            else:
                df = pd.DataFrame(data)

            # Ensure all required columns exist
            for col in self.categorical_features + self.numeric_features:
                if col not in df.columns:
                    df[col] = np.nan

            # Phase 1: Feature Engineering (Preprocessing)
            start_prep = time.time()
            preprocessor = self.model.named_steps['preprocessor']
            X_transformed = preprocessor.transform(df)
            prep_time = time.time() - start_prep

            # Phase 2: Model Inference
            start_inf = time.time()
            classifier = self.model.named_steps['classifier']
            scores = classifier.decision_function(X_transformed)
            inf_time = time.time() - start_inf

            # Map score to 0-1 risk range
            risk_score = 1.0 - ((scores[0] + 0.5) / 1.0)
            return float(np.clip(risk_score, 0, 1)), prep_time, inf_time

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return 0.5, 0.0, 0.0
