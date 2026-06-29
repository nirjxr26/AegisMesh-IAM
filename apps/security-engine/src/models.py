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
