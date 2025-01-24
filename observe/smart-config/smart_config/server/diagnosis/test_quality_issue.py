from smart_config.server.diagnosis.analyzer_diagnoser import AnalyzerDiagnoser
from smart_config.server.diagnosis.quality_issue import QualityIssue, QualityIssueName


def test_describe_quality_issues():
    issues = [
        QualityIssue(QualityIssueName.limited_diagnostic_data, 'a1', 'c1', 'analysis_results'),
        QualityIssue(QualityIssueName.limited_diagnostic_data, 'a1', 'c2', 'analysis_results')
    ]
    diagnoser = AnalyzerDiagnoser('org', 'ds', 'id', '',  '')
    diagnoser.quality_issues = issues
    issues = diagnoser.describe_quality_issues()
    assert len(issues) == 1
    assert issues[0].detectors == ['c1', 'c2']
    assert "analysis_results available for less than 10 batches" in issues[0].description
