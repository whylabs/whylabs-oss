from whylabs_toolkit.monitor.models import Analyzer

from smart_config.server.diagnosis.detectors.stale_results import StaleResults
from smart_config.server.diagnosis.diagnostic_data import DiagnosticData

analyzer1 = Analyzer.parse_obj(
    {
        "config": {"type": "fixed", "metric": "mean"},
        "targetMatrix": {"type": "column", "include": ["col1"]},
    })

# test data with first batch not stale, second batch stale
data = DiagnosticData(analyzer1, num_batches=5, granularity='daily', interval='', segment=[])
batches = [{'timestamp': 100, 'last_upload_ts': 131, 'column': 'col1'},
           {'timestamp': 200, 'last_upload_ts': 281, 'column': 'col1'}]
results = [{'anomalyCount': 0, 'datasetTimestamp': 100, 'creationTimestamp': 151},
           {'anomalyCount': 0, 'datasetTimestamp': 200, 'creationTimestamp': 251}]

detector = StaleResults()


def test_check_stale():
    data.set_analysis_results(results)
    data.set_diagnostic_batches(batches)
    assert not detector.missing_data(analyzer1, data)
    cond = detector.check(analyzer1, data)
    assert cond is not None
    assert cond.name == detector.condition


def test_check_not_stale():
    data.set_analysis_results(results[0:1])
    data.set_diagnostic_batches(batches[0:1])
    assert detector.check(analyzer1, data) is None


def test_matches_analyzer():
    assert detector.matches_analyzer(analyzer1)
