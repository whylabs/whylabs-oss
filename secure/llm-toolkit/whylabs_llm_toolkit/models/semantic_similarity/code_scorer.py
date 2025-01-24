from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.eval.evaluation_metrics import BinaryClassificationResult, ResultGroup

from .base import Scorer
from .base_chroma import ChromaScorer


class CodeScorer(Scorer):
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None):
        super().__init__(dataset="code", tag=tag, version=version, encoder_name=encoder_name)

    def evaluate(self) -> ResultGroup:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import TopicsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Install the `eval` extra to use this feature. ")
        code_benchmark = TopicsBenchmark(auto_threshold=True, topic="code", n=5000)
        results = code_benchmark.run(self)
        return results


class CodeScorerChroma(ChromaScorer):
    # Use chromaDB
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None, neighbors_num: int = 1):
        super().__init__("code", tag=tag, encoder_name=encoder_name, version=version)

    def evaluate(self) -> dict[str, BinaryClassificationResult]:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import TopicsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Please install the `eval` package to use this feature. ")
        medical_benchmark = TopicsBenchmark(auto_threshold=True, topic="code", n=5000)
        results: dict[str, BinaryClassificationResult] = medical_benchmark.run(self)  # pyright: ignore[reportCallIssue, reportArgumentType, reportUnknownVariableType]
        return results  # pyright: ignore[reportUnknownVariableType]
