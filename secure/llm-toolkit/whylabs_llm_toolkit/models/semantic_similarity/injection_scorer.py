from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.eval.evaluation_metrics import BinaryClassificationResult, ResultGroup

from .base import Scorer
from .base_chroma import ChromaScorer


class InjectionScorer(Scorer):
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None, neighbors_num: int = 8):
        super().__init__(dataset="injections", tag=tag, version=version, encoder_name=encoder_name, neighbors_num=neighbors_num)

    def evaluate(self) -> ResultGroup:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import InjectionsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Install the `eval` extra to use this feature.")
        injections_benchmark = InjectionsBenchmark(auto_threshold=True)
        results = injections_benchmark.run(self)
        return results


class InjectionScorerChroma(ChromaScorer):
    # Use chromaDB
    def __init__(self, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None, neighbors_num: int = 14):
        super().__init__(dataset="injections", tag=tag, encoder_name=encoder_name, version=version, neighbors_num=neighbors_num)

    def evaluate(self) -> dict[str, BinaryClassificationResult]:
        try:
            from whylabs_llm_toolkit.eval.benchmarks import InjectionsBenchmark
        except ModuleNotFoundError:
            raise ModuleNotFoundError("Please install the `eval` package to use this feature. ")
        injections_benchmark = InjectionsBenchmark(auto_threshold=True)
        results: dict[str, BinaryClassificationResult] = injections_benchmark.run(self)  # pyright: ignore [reportCallIssue, reportArgumentType, reportUnknownVariableType]
        return results  # pyright: ignore [reportUnknownVariableType]
