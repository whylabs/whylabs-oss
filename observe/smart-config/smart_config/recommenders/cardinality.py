from typing import List, Any

from smart_config.recommenders.recommender import MonitorRecommender, RecommenderOptions, filter_monitors
from whylogs.core.utils import get_cardinality_estimate
from whylogs.core import CardinalityThresholds
from whylabs_toolkit.monitor import MonitorSetup
from whylabs_toolkit.monitor.models import StddevConfig, SimpleColumnMetric, \
    DiffConfig, DiffMode, TrailingWindowBaseline, ThresholdType, ColumnMatrix, ReferenceProfileId


class CardinalityRecommender(MonitorRecommender):
    @classmethod
    def recommend(cls, options: RecommenderOptions) -> List[Any]:
        # TODO refactor and extract reusable bits!!
        recommended_monitors = []
        columns = options.ref_profile.view().get_columns()
        ref_profile_baseline = ReferenceProfileId(profileId=options.ref_profile_id)

        # placeholder to hold which columns are recommended to have which types of monitor
        few_fixed_values_columns = []  # likely fixed enums
        limited_values_columns = []  # repeating values but maybe not fixed
        limited_range_ints_columns = []  # may really be numbers
        high_card_categorical_columns = []  # likely ids

        # decide what monitoring is relevant
        for col, col_profile in columns.items():
            # abstract into a function that takes semantic type & profile and returns recommended monitoring type
            cardinality_estimate = get_cardinality_estimate(col_profile)
            # TODO exclude non-discrete & unknown type? - this prob breaks
            if cardinality_estimate.get("unique_pct") < CardinalityThresholds.proportionately_few:
                if 0 < cardinality_estimate.get("est") <= CardinalityThresholds.few:  # 50 may actually be too many here
                    few_fixed_values_columns.append(col)
                else:
                    # if int and bunched together, then create specific range monitor as a condition count
                    # else
                    limited_values_columns.append(col)
            else:
                if cardinality_estimate.get("unique_pct") > 0.9:
                    high_card_categorical_columns.append(col)
                # else just ratio?

        # low cardinality columns where all values should be a subset of those in ref profile
        if len(few_fixed_values_columns) > 0:
            # would prefer to setup a frequent_string_comparison monitor with baseline_includes_all_target operator
            # monitor_setup = MonitorSetup(
            #     monitor_id='freq-item-comparison-baseline-includes-all',
            #     dataset_id=dataset_id
            # )
            monitor_setup = MonitorSetup(
                monitor_id='unique-count-no-more-than-ref',
                dataset_id=options.dataset_id,
            )
            # for now, require the target unique count to be no more than the ref unique count
            monitor_setup.config = DiffConfig(
                metric=SimpleColumnMetric.unique_est,
                mode=DiffMode.pct,
                thresholdType=ThresholdType.upper,
                threshold=0.5,  # allow 0.5% because these are estimated values (OR should be ok for low #??)
                baseline=ref_profile_baseline,
            )
            monitor_setup.target_matrix = ColumnMatrix(include=few_fixed_values_columns)
            monitor_setup.apply()
            recommended_monitors.append(monitor_setup)

        # setup a stddev monitor against trailing window for cols with limited values
        if len(limited_values_columns) > 0:

            monitor_setup = MonitorSetup(
                monitor_id='unique-count-within-3-stddev-trailing',
                dataset_id=options.dataset_id
            )
            monitor_setup.config = StddevConfig(
                metric=SimpleColumnMetric.unique_est,
                factor=3.0,
                baseline=TrailingWindowBaseline(size=7),
            )
            monitor_setup.target_matrix = ColumnMatrix(include=limited_values_columns)
            monitor_setup.apply()
            recommended_monitors.append(monitor_setup)


        # setup a ratio monitor for cols with high cardinality
        if len(high_card_categorical_columns) > 0:

            monitor_setup = MonitorSetup(
                monitor_id='consistent-high-unique-ratio',
                dataset_id=options.dataset_id
            )
            monitor_setup.config = StddevConfig(
                metric=SimpleColumnMetric.unique_est_ratio,
                factor=3.0,
                baseline=TrailingWindowBaseline(size=7),
            )
            monitor_setup.target_matrix = ColumnMatrix(include=high_card_categorical_columns)
            monitor_setup.apply()
            recommended_monitors.append(monitor_setup)

        return recommended_monitors


