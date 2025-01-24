from typing import List, Any

from whylogs import ResultSet
from whylabs_toolkit.monitor import MonitorSetup

from smart_config.policy import RecommenderPolicy
from smart_config.recommenders.types import AnalysisMetric, TypeHints, MetricCategory


def filter_monitors(recommended_monitors: List[MonitorSetup], metrics: List[AnalysisMetric]):
    return [monitor for monitor in recommended_monitors if monitor.analyzer.config.metric in metrics]


class RecommenderOptions:
    def __init__(self,
        org_id: str,
        dataset_id: str,
        ref_profile: ResultSet,
        ref_profile_id: str,
        type_hints: TypeHints = None,
        categories: List[MetricCategory] = None,
        metrics: List[AnalysisMetric] = None,
        policies: List[RecommenderPolicy] = None,
    ):
        self.org_id = org_id
        self.dataset_id = dataset_id
        self.ref_profile = ref_profile
        self.type_hints = type_hints
        self.categories = categories
        self.metrics = metrics
        self.policies = policies
        self.ref_profile_id = ref_profile_id


class MonitorRecommender:
    @classmethod
    def recommend(cls, options: RecommenderOptions) -> List[Any]:
        return []



