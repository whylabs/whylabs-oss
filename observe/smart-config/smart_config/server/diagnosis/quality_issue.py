from enum import Enum
from typing import Dict


class QualityIssueName(str, Enum):
    limited_diagnostic_data = 'limited_{0}'
    missing_diagnostic_data = 'missing_{0}'
    analyzer_changed = 'analyzer_changed'
    too_many_analysis_results = 'too_many_analysis_results'
    too_many_columns = 'too_many_columns'


_condition_map: Dict[QualityIssueName, str] = {
    QualityIssueName.limited_diagnostic_data: '{0} available for less than 10 batches',
    QualityIssueName.missing_diagnostic_data: 'Missing diagnostic data "{0}"',
    QualityIssueName.analyzer_changed: 'Analyzer changed within the diagnostic interval',
    QualityIssueName.too_many_analysis_results:
        'Detector ran on a subset of the analysis results as too much data was requested',
    QualityIssueName.too_many_columns:
        'Detector ran on a subset of the columns with anomalies'
}


class QualityIssue:
    def __init__(self, name: QualityIssueName, analyzer_id: str, detector_name: str, data: str = ''):
        self.name = name.value.format(data)
        self.analyzer_id = analyzer_id
        self.detector_name = detector_name
        self.description = _condition_map.get(name, str(name)).format(data)

    def describe(self) -> str:
        return self.description
