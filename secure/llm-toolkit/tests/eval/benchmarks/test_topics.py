from typing import List, Literal, Optional, Sequence, Union, overload

import numpy as np
import numpy.typing as npt
import pytest

from whylabs_llm_toolkit.eval.benchmarks.topics_benchmark import TopicsBenchmark
from whylabs_llm_toolkit.models.base import Scorer, ScorerResult


class LangkitScorer(Scorer):
    @overload
    # text input
    def predict(self, inputs: List[str]) -> Sequence[float]:
        ...

    @overload
    # embeddings input
    def predict(self, inputs: npt.NDArray[np.float64]) -> Sequence[float]:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: List[str], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: npt.NDArray[np.float64], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    def predict(
        self, inputs: Union[npt.NDArray[np.float64], List[str]], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResult, Sequence[float]]:
        if isinstance(inputs, List):
            return [0.5 for _ in inputs]
        else:
            raise ValueError("Invalid input type.")


@pytest.mark.load
def test_medical_topics():
    topics_benchmark = TopicsBenchmark(auto_threshold=True, topic="medical")
    results = topics_benchmark.run(LangkitScorer())
    assert "topics_ds" in results.get_group_names()
    assert "20_newsgroups" in results.get_group_names()


def test_code_topics():
    code_benchmark = TopicsBenchmark(auto_threshold=True, topic="code")
    results = code_benchmark.run(LangkitScorer())
    assert "topics_ds" in results.get_group_names()
