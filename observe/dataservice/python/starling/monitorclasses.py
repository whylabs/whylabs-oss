import sys
from dataclasses import dataclass
from typing import Optional
from pydantic import BaseModel

import numpy as np
from dataclasses_json import dataclass_json


@dataclass_json
@dataclass
class ChartOutput(object):
    success: bool
    message: str


@dataclass_json
@dataclass
class CalculationResult(object):
    upperThreshold: Optional[float]
    lowerThreshold: Optional[float]
    absoluteUpper: Optional[float]
    absoluteLower: Optional[float]
    alertCount: Optional[int]
    value: Optional[float]
    shouldReplace: Optional[bool] = False
    replacementValue: Optional[float] = None
    adjustedPrediction: Optional[float] = None
    lambdaKeep: Optional[float] = None
    # Good for debugging in notebook. Java side doesn't use these
    actual: Optional[float] = None
    numBatchSize: Optional[int] = 0
    factor: Optional[float] = None


@dataclass_json
@dataclass
class Prediction(object):
    value: float
    lower: float
    upper: float
    alertCount: int
    shouldReplace: bool
    # Nullable if the above shouldReplace is false
    replacement: Optional[float]
    adjustedPrediction: Optional[float]
    lambdaKeep: Optional[float]

    def to_calc_result(self, actual: float) -> CalculationResult:
        return CalculationResult(
                upperThreshold=self.upper,
                lowerThreshold=self.lower,
                absoluteUpper=None,
                absoluteLower=None,
                alertCount=self.alertCount,
                value=self.value,
                shouldReplace=self.shouldReplace,
                replacementValue=self.replacement,
                actual=actual,
                adjustedPrediction=self.adjustedPrediction,
                lambdaKeep=self.lambdaKeep,
        )


@dataclass_json
@dataclass
class DriftCalculationResult(BaseModel):
    metricValue: float
    threshold: float
    alertCount: int


@dataclass_json
@dataclass
class Pair(BaseModel):
    key: int
    value: CalculationResult
