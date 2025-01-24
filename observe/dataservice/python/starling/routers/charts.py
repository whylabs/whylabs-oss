from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from starling.monitorclasses import ChartOutput
from starling.arimachart_func import ArimaChartFunction
from starling.driftchart_func import DriftChartFunction
from starling.stddevchart_func import StddevChartFunction

router = APIRouter(prefix='/charts')

class PyChartRequest(BaseModel):
    data: List[dict]
    path: str
    columnName: str
    segmentText: Optional[str]
    metric : Optional[str]


@router.post("/arima")
def pmdarima_chart(request: PyChartRequest) -> ChartOutput:
    return ArimaChartFunction().compute(data=request.data, path=request.path, columnName=request.columnName,
                                            segmentText=request.segmentText, metric=request.metric)


@router.post("/drift")
def drift_chart(request: PyChartRequest) -> ChartOutput:
    return DriftChartFunction().compute(data=request.data, path=request.path, columnName=request.columnName,
                                            segmentText=request.segmentText, metric=request.metric)

@router.post("/stddev")
def stddev_chart(request: PyChartRequest) -> ChartOutput:
    return StddevChartFunction().compute(data=request.data, path=request.path, columnName=request.columnName,
                                            segmentText=request.segmentText, metric=request.metric)

