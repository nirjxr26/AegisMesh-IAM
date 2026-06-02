import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os
from sqlalchemy import create_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self, model_path="models/isolation_forest.joblib"):
        self.model_path = model_path
        self.model = self._load_model()
        self.db_url = os.getenv("DATABASE_URL")

    def _load_model(self):
        if os.path.exists(self.model_path):
            logger.info(f"Loading existing model from {self.model_path}")
            return joblib.load(self.model_path)
        return IsolationForest(contamination=0.05, random_state=42)

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

        # Preprocessing: Convert categorical to numeric (simplified for now)
        df_encoded = pd.get_dummies(df[['action', 'category', 'result']])
        df_encoded['duration'] = df['duration'].fillna(0)

        logger.info("Training Isolation Forest model...")
        self.model.fit(df_encoded)
        
        # Save model
        joblib.dump(self.model, self.model_path)
        logger.info(f"Model saved to {self.model_path}")

    def predict_risk(self, data):
        """
        Predicts if a given action is anomalous.
        Returns a risk score between 0 and 1.
        """
        # In a real scenario, this would need the same encoding as training
        # For now, we return a mock logic or placeholder for the full pipeline
        try:
            # Placeholder for transformation logic
            # prediction = self.model.predict(data) # -1 for anomaly, 1 for normal
            return 0.1 # Default low risk
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return 0.5
