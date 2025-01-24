from whylabs_toolkit.monitor.diagnoser.recommendation.change_recommender import ChangeRecommender
from whylabs_toolkit.monitor.diagnoser.models.diagnosis_report import MonitorDiagnosisReport
# setup api key
import diagnoser_setup

def run_recommend_changes():
    test_report = MonitorDiagnosisReport.parse_file('diagnosis.json')
    recommender = ChangeRecommender(test_report)
    changes = recommender.recommend()
    print(f'\nRecommended changes for "{test_report.monitor.displayName}" [{test_report.monitor.id}] monitor:')
    for change in changes:
        print('\t* ' + change.describe())
    results = recommender.make_changes(changes)
    print(results.describe())


if __name__ == "__main__":
    run_recommend_changes()
