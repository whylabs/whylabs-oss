from diagnoser_setup import org_id, dataset_id
from whylabs_toolkit.monitor.diagnoser.monitor_diagnoser import MonitorDiagnoser

# analyzer_id = 'old-crimson-starling-2516-analyzer'  # discrete
analyzer_id = 'proud-seagreen-carabeef-65-analyzer'  # continuous, with segments

if __name__ == "__main__":
    diagnoser = MonitorDiagnoser(org_id, dataset_id)
    diagnoser.detect_noisy_monitors()
    monitor = next(iter([mon for mon in diagnoser.noisy_monitors if mon.analyzer_id == analyzer_id]), None)
    if monitor is None:
        raise ValueError(f'No monitor found for analyzer {analyzer_id}')
    diagnoser.monitor_id_to_diagnose = monitor.monitor_id
    report = diagnoser.diagnose()
    print(report.describe())
    with open('diagnosis.json', 'w') as f:
        f.write(report.json(indent=2))
