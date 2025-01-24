from typing import List, Any

from whylabs_toolkit.monitor.models.analyzer.targets import ColumnGroups

from smart_config.recommenders.recommender import MonitorRecommender, RecommenderOptions
from whylabs_toolkit.monitor.models import StddevConfig, SimpleColumnMetric, \
    TrailingWindowBaseline, ColumnMatrix, DriftConfig, ComplexMetrics, DatasetMatrix, FixedThresholdsConfig
from whylabs_toolkit.monitor import MonitorSetup


class DefaultRecommender(MonitorRecommender):
    @classmethod
    def recommend(cls, options: RecommenderOptions) -> List[Any]:
        recommended_monitors = []
        # TODO window size vary by granularity
        trailing_window_baseline = TrailingWindowBaseline(size=7)

        # Missing values
        monitor_setup = MonitorSetup(
            monitor_id='missing-value-ratio-stddev',
            dataset_id=options.dataset_id,
        )
        monitor_setup.config = StddevConfig(
            metric=SimpleColumnMetric.count_null_ratio,
            factor=3.0,
            baseline=trailing_window_baseline,
        )
        monitor_setup.apply()
        recommended_monitors.append(monitor_setup)

        # Unique values
        monitor_setup = MonitorSetup(
            monitor_id='unique-count-stddev',
            dataset_id=options.dataset_id,
        )
        monitor_setup.config = StddevConfig(
            metric=SimpleColumnMetric.unique_est,
            factor=3.0,
            baseline=trailing_window_baseline,
        )
        monitor_setup.target_matrix = ColumnMatrix(include=[ColumnGroups.group_discrete])
        monitor_setup.apply()
        recommended_monitors.append(monitor_setup)

        # Non-discrete drift
        monitor_setup = MonitorSetup(
            monitor_id='drift-nondiscrete',
            dataset_id=options.dataset_id,
        )
        monitor_setup.config = DriftConfig(
            metric=ComplexMetrics.histogram,
            threshold=0.7,
            baseline=trailing_window_baseline,
        )
        monitor_setup.apply()
        monitor_setup.target_matrix = ColumnMatrix(include=[ColumnGroups.group_continuous])
        recommended_monitors.append(monitor_setup)

        # Discrete drift
        monitor_setup = MonitorSetup(
            monitor_id='drift-discrete',
            dataset_id=options.dataset_id,
        )
        monitor_setup.config = DriftConfig(
            metric=ComplexMetrics.frequent_items,
            threshold=0.7,
            baseline=trailing_window_baseline,
        )
        monitor_setup.target_matrix = ColumnMatrix(include=[ColumnGroups.group_discrete])
        monitor_setup.apply()
        recommended_monitors.append(monitor_setup)

        # Inferred data type - not currently working
        # monitor_setup = MonitorSetup(
        #     monitor_id='inferred-data-type',
        #     dataset_id=options.dataset_id,
        # )
        # monitor_setup.config = ComparisonConfig(
        #     type='comparison',
        #     metric=SimpleColumnMetric.inferred_data_type,
        #     baseline=trailing_window_baseline,
        #     operator=ComparisonOperator.eq
        # )
        # monitor_setup.target_matrix = ColumnMatrix()
        # monitor_setup.apply()
        # recommended_monitors.append(monitor_setup)

        # Integration health
        monitor_setup = MonitorSetup(
            monitor_id='missing-datapoint',
            dataset_id=options.dataset_id,
        )
        monitor_setup.config = FixedThresholdsConfig(
            metric='missingDatapoint',  # missing from DatasetMetric enum
            upper=0,
        )
        monitor_setup.target_matrix = DatasetMatrix()
        recommended_monitors.append(monitor_setup)
        monitor_setup.apply()

        return recommended_monitors


