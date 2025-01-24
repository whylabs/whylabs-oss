from typing import List

from smart_config.server.diagnosis.icondition_describer import IConditionDescriber


class Condition:
    def __init__(self, describer: IConditionDescriber, columns: List[str] = None,
                 info: dict = None):
        self.name = describer.condition
        self.describer = describer
        self.columns = columns
        self.info = info

    def describe(self) -> str:
        return self.describer.describe(self)

    def summarize(self) -> str:
        return self.describer.summarize(self)

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'columns': self.columns,
            'summary': self.summarize(),
            'info': self.info
        }


