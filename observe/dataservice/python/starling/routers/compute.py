from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from starling.monitorclasses import Prediction, ChartOutput
from starling.pmdarima_func import PmdArimaFunction
from starling.arimachart_func import ArimaChartFunction

router = APIRouter(prefix='/compute')


class PmdArimaRequest(BaseModel):
    values: List[Optional[float]]
    timestamps: List[int]
    actual: float
    priors: List[dict]
    alpha: float
    stddevFactor: float
    stddevMaxBatchSize: int
    p: int
    d: int
    q: int
    seasonal_P: int  # noqa
    seasonal_D: int  # noqa
    seasonal_Q: int  # noqa
    m: int
    eventPeriods: List[str] = None,
    oob_multiple: float = 1.0
    adjustment_tries: int = 10
    lambda_keep: float = 0.5


@router.post("/arima")
def pmdarima_compute(request: PmdArimaRequest) -> Prediction:
    return PmdArimaFunction().compute(values=request.values, timestamps=request.timestamps, actual=request.actual,
                                          priors=request.priors,
                                          alpha=request.alpha,
                                          stddevFactor=request.stddevFactor,
                                          stddevMaxBatchSize=request.stddevMaxBatchSize,
                                          p=request.p,
                                          d=request.d,
                                          q=request.q,
                                          seasonal_P=request.seasonal_P,
                                          seasonal_Q=request.seasonal_Q,
                                          seasonal_D=request.seasonal_D,
                                          m=request.m,
                                          eventPeriods=request.eventPeriods,
                                          oob_multiple=request.oob_multiple,
                                          adjustment_tries=request.adjustment_tries,
                                          lambda_keep=request.lambda_keep,
                                          )

