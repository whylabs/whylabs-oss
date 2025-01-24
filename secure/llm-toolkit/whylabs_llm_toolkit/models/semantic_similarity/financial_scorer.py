from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.eval.evaluation_metrics import BinaryClassificationResult, ResultGroup

from .base import Scorer
from .base_chroma import ChromaScorer


class FinancialScorer(Scorer):
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None):
        super().__init__(dataset="financial", tag=tag, version=version, encoder_name=encoder_name)

    def evaluate(self) -> ResultGroup:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import TopicsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Install the `eval` extra to use this feature. ")
        code_benchmark = TopicsBenchmark(auto_threshold=True, topic="finance", n=5000)
        results = code_benchmark.run(self)
        return results


class FinancialScorerChroma(ChromaScorer):
    # Use chromaDB
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None, neighbors_num: int = 1):
        super().__init__("financial", tag=tag, encoder_name=encoder_name, version=version)  # pyright

    def evaluate(self) -> dict[str, BinaryClassificationResult]:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import TopicsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Please install the `eval` package to use this feature. ")
        financial_benchmark = TopicsBenchmark(auto_threshold=True, topic="finance", n=5000)
        results: dict[str, BinaryClassificationResult] = financial_benchmark.run(self)  # pyright: ignore[reportCallIssue, reportArgumentType, reportUnknownVariableType]
        return results  # pyright: ignore[reportUnknownVariableType]
