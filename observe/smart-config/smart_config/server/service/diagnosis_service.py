from whylabs_toolkit.monitor.diagnoser.models import AnalyzerDiagnosisReport
from smart_config.server.server import DiagnosisRequest
from smart_config.server.service.service_wrapper import ServiceWrapper


class DiagnosisService(ServiceWrapper):
    default_url = 'http://localhost:8092'

    def diagnose_sync(self, request: DiagnosisRequest) -> AnalyzerDiagnosisReport:
        return self._post(
            '/diagnose/sync',
            request.dict(),
        )

    def diagnose_async(self, request: DiagnosisRequest) -> str:
        return self._post(
            '/diagnose/async',
            request.dict(),
        )

    def diagnose_async_result(self, diagnosis_id: str) -> AnalyzerDiagnosisReport:
        return self._get( f'/diagnose/async/{diagnosis_id}')
