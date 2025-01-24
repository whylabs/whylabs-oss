from typing import List, Dict, Type

from whylabs_toolkit.monitor.diagnoser.recommendation import RecommendedChange
from whylabs_toolkit.monitor.diagnoser.models.diagnosis_report import ConditionRecord


class ActionRegistry:
    actions: Dict[str, List[Type[RecommendedChange]]] = {}

    @classmethod
    def register(cls, action_class: Type[RecommendedChange]):
        for condition in action_class.condition_names:
            if cls.actions[condition] is None:
                cls.actions[condition] = []
            cls.actions[condition].append(action_class)

    @classmethod
    def get_actions_for_condition(cls, condition: ConditionRecord) -> List[RecommendedChange]:
        action_classes = cls.actions.get(condition.name, [])
        return [clz(condition) for clz in action_classes]
