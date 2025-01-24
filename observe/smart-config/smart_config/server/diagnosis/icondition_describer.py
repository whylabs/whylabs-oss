class Condition:
    pass


class IConditionDescriber:
    condition: str

    def describe(self, condition: Condition) -> str:
        pass

    def summarize(self, condition: Condition) -> str:
        pass
