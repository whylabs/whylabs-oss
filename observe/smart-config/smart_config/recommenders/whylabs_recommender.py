from typing import List, Any, Type

from whylogs import ResultSet

from smart_config.policy import RecommenderPolicy
from smart_config.recommenders.cardinality import CardinalityRecommender
from smart_config.recommenders.default import DefaultRecommender
from smart_config.recommenders.recommender import RecommenderOptions, MonitorRecommender, filter_monitors
from smart_config.recommenders.types import AnalysisMetric, TypeHints, MetricCategory

from whylabs_toolkit.monitor import MonitorManager
from whylabs_toolkit.monitor.models import SimpleColumnMetric, ComplexMetrics, DatasetMetric

category_to_candidate_metric = {
    MetricCategory.data_quality: [SimpleColumnMetric.unique_est, SimpleColumnMetric.unique_est_ratio,
                                  SimpleColumnMetric.count_null, SimpleColumnMetric.count_null_ratio,
                                  SimpleColumnMetric.inferred_data_type],
    MetricCategory.data_drift: [ComplexMetrics.histogram, ComplexMetrics.frequent_items],
    MetricCategory.performance: [DatasetMetric.classification_accuracy, DatasetMetric.classification_f1,
                                 DatasetMetric.classification_precision, DatasetMetric.classification_recall],
    MetricCategory.ingestion: ['secondsSinceLastUpload', 'missingDatapoint']
}


class WhylabsMonitorRecommender(MonitorRecommender):
    recommenders = {}

    @classmethod
    def recommend(cls, options: RecommenderOptions) -> List[Any]:
        metrics = [] if options.metrics is None else options.metrics
        categories = [] if options.categories is None else options.categories
        if options.categories is None and options.metrics is None:
            # recommend everything
            metrics = [m for metrics in category_to_candidate_metric.values() for m in metrics]
        else:
            for c in categories:
                metrics = metrics + category_to_candidate_metric.get(c, [])

        # if there's no reference profile, there's nothing to be smart about so just return defaults
        if options.ref_profile is None:
            return DefaultRecommender.recommend(options)

        # return monitor recommendations from all of the relevant recommenders
        recommenders = set([cls.recommenders.get(m) for m in metrics if m in cls.recommenders])
        options.metrics = metrics
        monitors = []
        for recommender in recommenders:
            # only include the metrics that this recommender is registered to provide
            monitors = monitors + filter_monitors(
                recommender.recommend(options),
                [metric for metric, value in cls.recommenders.items() if value == recommender]
            )
        return monitors

    @classmethod
    def register(cls, recommender: Type[MonitorRecommender], metrics: List[AnalysisMetric]):
        """
        Use this method to register a recommender for a list of categories and metrics
        :param recommender: the recommender
        :param metrics: the metrics that the recommender can recommend for
        :return:
        """
        # For now, only allow a single recommender per metric (takes latest registered)
        for metric in metrics:
            cls.recommenders[metric] = recommender


def setup_recommended_monitors(
        org_id: str,  # Should be configurable, currently only picked up via ORG_ID env var
        dataset_id: str,
        ref_profile: ResultSet = None,
        ref_profile_id: str = None,
        type_hints: TypeHints = None,
        categories: List[MetricCategory] = None,
        metrics: List[AnalysisMetric] = None,
        policies: List[RecommenderPolicy] = None,
):
    monitors = WhylabsMonitorRecommender.recommend(
        RecommenderOptions(org_id, dataset_id, ref_profile, ref_profile_id, type_hints, categories, metrics, policies))
    for monitor in monitors:
        MonitorManager(setup=monitor).save()


# register all the prebuilt recommenders
# TODO registration should include whether ref data is needed, which policies are supported,
#  and let overall recommender choose best match
WhylabsMonitorRecommender.register(
    DefaultRecommender,
    [SimpleColumnMetric.count_null, SimpleColumnMetric.count_null_ratio, SimpleColumnMetric.inferred_data_type,
     ComplexMetrics.histogram, ComplexMetrics.frequent_items, 'missingDatapoint'])
WhylabsMonitorRecommender.register(
    CardinalityRecommender,
    [SimpleColumnMetric.unique_est, SimpleColumnMetric.unique_est_ratio])

#
# TODO
# Revisit conceptual model. For example, decision about monitoring against ref profile or trailing window or both. If
# ref profile is present, should it always be baseline subject to policy?
# For trailing window, period should vary depending on granularity
# For performance, if ref includes model metrics then infer model type(s), check label balance & recommend for classn
# RMSE for regression
# If no ref metrics and performance is explicitly requested ??
# Separate ability to generate condition counts to be applied to batch profiles; and include monitors for those
# What to do with semantic types. Need some examples before deciding how to tweak recommendation setup
