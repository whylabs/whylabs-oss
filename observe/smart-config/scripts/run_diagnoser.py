import traceback

import pandas as pd

from whylabs_toolkit.monitor.diagnoser.helpers.describe import describe_truncated_table
from whylabs_toolkit.monitor.diagnoser.monitor_diagnoser import MonitorDiagnoser
from whylabs_toolkit.monitor.diagnoser.models import MonitorDiagnosisReportList
from whylabs_toolkit.monitor.diagnoser.recommendation.change_recommender import ChangeRecommender
from scripts.diagnoser_setup import org_id, dataset_id


def run_diagnoser():
    # get the noisy monitor analysis
    desired_batches = 30
    diagnoser = MonitorDiagnoser(org_id, dataset_id)
    diagnoser.desired_batches = desired_batches

    print(f'Noise detector is diagnosing monitors for {org_id} dataset {dataset_id}')
    diagnoser.detect_noisy_monitors()
    noisy_monitors_with_actions = pd.DataFrame.from_records([n.dict() for n in diagnoser.noisy_monitors_with_actions])
    noisy_monitors_without_actions = pd.DataFrame.from_records([n.dict() for n in diagnoser.noisy_monitors_without_actions])


    reports = []

    def diagnose_monitor(monitor_id):
        try:
            diagnoser.monitor_id_to_diagnose = monitor_id
            diagnosis = diagnoser.diagnose()
            print(diagnosis.describe())
            reports.append(diagnosis)
        except Exception as e:
            print(f'Unable to diagnose {monitor_id} due to exception:\n {traceback.format_exc()}')

    if len(diagnoser.noisy_monitors_with_actions) > 0:
        print("Monitors with actions")
        print(describe_truncated_table(noisy_monitors_with_actions, 10))
        print(f'\nDiagnosing the top noisiest analyzers *with* notifications')
        for monitor in diagnoser.noisy_monitors_with_actions:
            diagnose_monitor(monitor.monitor_id)
            yesno = input("\nContinue Y/N? ").upper()
            # yesno = 'Y'
            if yesno == 'N':
                break

        if len(diagnoser.noisy_monitors_without_actions) > 0:
            yesno = input("\nDiagnose analyzers without notifications Y/N? ").upper()
            # yesno = 'Y'
        else:
            yesno = 'N'
    else:
        yesno = 'Y'

    if yesno == 'Y':
        print("Monitors without actions")
        print(describe_truncated_table(noisy_monitors_without_actions, 10))
        print(f'Diagnosing the top noisiest analyzers *without* notifications for {org_id} dataset {dataset_id}')
        for monitor in diagnoser.noisy_monitors_without_actions:
            diagnose_monitor(monitor.monitor_id)
            yesno = input("\nContinue Y/N? ").upper()
            # yesno = 'Y'
            if yesno == 'N':
                break

    with open('reports.json', 'w') as f:
        f.write(MonitorDiagnosisReportList.parse_obj(reports).json(indent=2))

    yesno = input("\nGet recommended changes Y/N? ").upper()

    found_changes = False
    if yesno == 'Y':
        print(f'\nLooking for recommended changes for all columns with 1 or more anomalies')
        for report in reports:
            recommender = ChangeRecommender(report)
            recommender.min_anomaly_count = 1
            changes = recommender.recommend()
            if len(changes):
                found_changes = True
            print(f'\nRecommended changes for analyzer {report.analyzer.id}:')
            for change in changes:
                print(change.describe())

    if not found_changes:
        print('No recommended changes found')


if __name__ == "__main__":
    run_diagnoser()
