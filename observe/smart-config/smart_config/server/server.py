from enum import Enum

import uvicorn
from typing import List, Union, Optional
from typing_extensions import Annotated
from fastapi import FastAPI, Header, HTTPException

from pydantic import BaseModel
from whylabs_toolkit.monitor.models import Segment

from whylabs_toolkit.monitor.diagnoser.models import AnalyzerDiagnosisReport
from smart_config.server.diagnosis.analyzer_diagnoser import AnalyzerDiagnoser

app = FastAPI()


class DiagnosisRequest(BaseModel):
    orgId: str
    datasetId: str
    analyzerId: str
    interval: str
    columns: Optional[List[str]]
    segment: Segment


class AsyncDiagnosisResponse(BaseModel):
    diagnosisId: str


class AsyncDiagnosisResultRequest(BaseModel):
    orgId: str
    datasetId: str
    diagnosisId: str


class Status(str, Enum):
    """Supported request statuses."""

    PENDING = "PENDING"
    FAILED = "FAILED"
    COMPLETE = "COMPLETE"


class AsyncDiagnosisResultResponse(BaseModel):
    statu: Status
    report: Optional[AnalyzerDiagnosisReport]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/diagnose/sync")
async def diagnose_sync(request: DiagnosisRequest, x_api_key: Annotated[Union[str, None], Header()] = None) -> (
        AnalyzerDiagnosisReport):
    diagnoser = AnalyzerDiagnoser(
        org_id=request.orgId,
        dataset_id=request.datasetId,
        analyzer_id=request.analyzerId,
        interval=request.interval,
        api_key=x_api_key)
    diagnoser.assemble_data(request.segment.tags, request.columns)
    diagnoser.run_detectors()
    return diagnoser.summarize_diagnosis()


@app.post("/diagnose/async")
async def diagnose_async(request: DiagnosisRequest) -> AsyncDiagnosisResponse:
    # TODO kick off a background task to diagnose and return a diagnosis Id.
    # Diagnosis ID will include the initiation timestamp and a unique ID, so the fully qualified path can be determined from it.
    # Write response to <prefix>/<orgId>/<datasetId>/YYYY-MM-DD/<diagnosisId>.json where the date is based on initiation timestamp.
    # Response file will contain status = FAILED and no report, or status = COMPLETE and a diagnosis report.
    raise HTTPException(status_code=501, detail="Not implemented yet - coming soon")
    # return AsyncDiagnosisResponse(diagnosisId='12344545-afgarggr46')


@app.post("/diagnose/async/result")
async def diagnose_async_result(request: AsyncDiagnosisResultRequest) -> AsyncDiagnosisResultResponse:
    # If there is a response file return it (status will be included in the file)
    # If there is no file and initiation timestamp is within last 30 minutes, return status PENDING else FAILED
    raise HTTPException(status_code=501, detail="Not implemented yet - coming soon")


if __name__ == "__main__":
    import os
    dirname = os.path.dirname(__file__)
    log_config_file = os.path.join(dirname, 'logging_config.conf')
    uvicorn.run(app, host="0.0.0.0", port=8092, log_config=log_config_file)
