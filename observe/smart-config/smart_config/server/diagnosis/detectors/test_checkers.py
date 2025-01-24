from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.detectors.condition_detector import ConditionDetector
from smart_config.server.diagnosis.condition import Condition

from smart_config.server.diagnosis.registry.detector_registry import DetectorRegistry
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData


class AConditionDetector(ConditionDetector):
    condition = 'test_condition'
    required_data = ['analysis_results', 'diagnostic_profile', 'diagnostic_batches']


# very minimal data to test quality conditions
batches = [{'timestamp': 100, 'column': 'col1'}, {'timestamp': 200, 'column': 'col1'}]
results = [{'anomalyCount': 0, 'datasetTimestamp': 100}, {'anomalyCount': 0, 'datasetTimestamp': 200}]
analyzer1 = Analyzer.parse_obj(
    {
        "id": "test_analyzer",
        "config": {"type": "fixed", "metric": "mean", "upper": 1.0},
        "targetMatrix": {"type": "column", "include": ["col1"]},
    })
data = DiagnosticData(analyzer1, num_batches=5, granularity='daily', interval='', segment=[])
data.set_diagnostic_batches(batches)
data.set_analysis_results(results)
test_detector = AConditionDetector()


def test_describe_returns_text():
    for detector in DetectorRegistry.detectors.values():
        condition = Condition(detector, ['col1'])
        text = condition.describe()
        assert(detector.condition in text)


def test_missing_data():
    issues = test_detector.missing_data(analyzer1, data)
    assert len(issues) == 1
    issue = issues[0]
    assert issue.name == 'missing_diagnostic_profile'
    assert issue.detector_name == 'test_condition'
    assert issue.analyzer_id == 'test_analyzer'


def test_poor_data():
    issues = test_detector.poor_data(analyzer1, data)
    assert len(issues) == 2
    assert issues[0].name == 'limited_analysis_results'
    assert issues[1].name == 'limited_diagnostic_batches'
