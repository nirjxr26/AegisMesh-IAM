from typing import Optional
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    action: Optional[str] = None
    category: Optional[str] = None
    result: Optional[str] = None
    duration: Optional[float] = None


class TrainRequest(BaseModel):
    contamination: Optional[float] = None
    random_state: Optional[int] = None


class AnalyzeResponse(BaseModel):
    risk_score: float
    is_anomaly: bool
    analysis_time_ms: float
    active_version: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    active_version: str


class TrainResponse(BaseModel):
    message: str
    new_version: str
