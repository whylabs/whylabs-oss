import itertools
import logging
import time
from dataclasses import dataclass, field
from logging import getLogger
from typing import Dict, List, Optional, Sequence, Tuple, Union, cast, overload

import pandas as pd

from whylabs_llm_toolkit.models.base import BinaryClassifier, MultiInputScorer, Scorer

from ..datasets_types import (
    BinaryClassificationDataset,
    MultiInputBinaryClassificationDataset,
)
from ..evaluation_metrics import (
    BinaryClassificationResult,
    MetricInput,
    ResultGroup,
    calculate_binary_classification_results,
    find_predictions_for_best_threshold,
)

logger = getLogger(__name__)
_BATCH_SIZE = 500

logger = logging.getLogger(__name__)


def create_group(row, dataset_name: str, split_labels: bool = False):  # pyright: ignore[reportUnknownParameterType]
    if not split_labels:
        if row["dataset"] == dataset_name:
            return f"{dataset_name}/{row['source']}"
        else:
            return f"non-{dataset_name}/{row['dataset']}"
    else:
        return f"{dataset_name}/{row['source']}"


def add_group_column(df: pd.DataFrame, dataset_name: str, split_labels: bool = False) -> pd.DataFrame:
    df["group"] = df.apply(lambda row: create_group(row, dataset_name, split_labels), axis=1)  # pyright: ignore[reportUnknownArgumentType,reportUnknownLambdaType]
    return df


def evaluate(
    dataset_name: str, data: pd.DataFrame, beta: float = 0.5, threshold: Optional[float] = None, split_labels: bool = False
) -> ResultGroup:
    data["label"] = (data["dataset"] == dataset_name).astype(int)
    data = add_group_column(data, dataset_name, split_labels)
    assert "score" in data.columns
    assert "label" in data.columns
    assert "dataset" in data.columns
    assert "source" in data.columns
    assert "group" in data.columns
    labels = cast(List[int], data["label"].to_list())
    scores = cast(List[float], data["score"].to_list())
    if not threshold:
        threshold, predictions = find_predictions_for_best_threshold(labels=labels, scores=scores, beta=beta)
    else:
        predictions = [1 if s >= threshold else 0 for s in scores]
    metric_input = MetricInput(
        labels=labels,
        scores=scores,
        predictions=predictions,
        group_names=cast(List[str], data["group"].to_list()),
        threshold=threshold,
    )
    dataset_results: ResultGroup = calculate_binary_classification_results(metric_input=metric_input)
    return dataset_results


def batch_predict(
    model: Union[BinaryClassifier, Scorer, MultiInputScorer],
    dataset: Union[BinaryClassificationDataset, MultiInputBinaryClassificationDataset],
    batch_size=_BATCH_SIZE,
) -> Sequence[Union[float, int]]:
    inputs = dataset.inputs
    all_predictions: Sequence[float] = []
    if isinstance(model, MultiInputScorer):
        if isinstance(dataset, MultiInputBinaryClassificationDataset):
            context = dataset.context
            if context:
                for i in range(0, len(inputs), batch_size):
                    logger.debug(f"batch {i}")
                    batch_predictions: Sequence[float] = model.predict(inputs[i : i + batch_size], context[i : i + batch_size])
                    all_predictions.extend(batch_predictions)
    else:
        for i in range(0, len(inputs), batch_size):
            logger.debug(f"batch {i}")
            batch_predictions = model.predict(inputs[i : i + batch_size])
            all_predictions.extend(batch_predictions)
    return all_predictions


@dataclass
class BinaryClassificationBenchmark:
    description: str
    datasets: Sequence[Union[BinaryClassificationDataset, MultiInputBinaryClassificationDataset]] = field(default_factory=list)
    classification_threshold: Optional[float] = None
    auto_threshold: Optional[bool] = False
    n: Optional[int] = None

    def __post_init__(self):
        if not self.datasets:
            self.datasets = self.load_datasets(n=self.n)

    def weighted_average_score(self, results: Dict[str, BinaryClassificationResult]) -> Tuple[float, float]:
        raise NotImplementedError("not implemented")

    @overload
    def run(self, model: Scorer) -> ResultGroup:
        pass

    @overload
    def run(self, model: BinaryClassifier) -> ResultGroup:
        pass

    @overload
    def run(self, model: MultiInputScorer) -> ResultGroup:
        pass

    def get_all_data(self) -> BinaryClassificationDataset:
        flattened_inputs = list(itertools.chain.from_iterable([ds.inputs for ds in self.datasets]))
        flattened_labels = list(itertools.chain.from_iterable([ds.labels for ds in self.datasets]))
        all_data_ds = BinaryClassificationDataset(name="all_data", inputs=flattened_inputs, labels=flattened_labels)
        return all_data_ds

    def run(
        self,
        model: Union[BinaryClassifier, Scorer, MultiInputScorer],
        batch_size=_BATCH_SIZE,
        plots: bool = False,
    ) -> ResultGroup:
        if not self.datasets:
            raise ValueError("No datasets found")
        all_data_ds = self.get_all_data()
        labels = all_data_ds.labels
        time_start = time.time()
        inferences = list(batch_predict(model, all_data_ds, batch_size=batch_size))
        time_end = time.time()
        duration = time_end - time_start
        flattened_names = list(itertools.chain.from_iterable([[ds.name for _ in ds.inputs] for ds in self.datasets]))
        predictions = None
        scores, predictions, threshold = self.resolve_inferences(labels=labels, inferences=inferences)
        metric_input = MetricInput(
            labels=labels, scores=scores, predictions=predictions, group_names=flattened_names, threshold=threshold, time=duration
        )
        dataset_results: ResultGroup = calculate_binary_classification_results(metric_input=metric_input, plots=plots)
        return dataset_results

    def resolve_inferences(
        self,
        labels: Sequence[int],
        inferences: Union[Sequence[float], Sequence[int]],
    ):
        predictions: Sequence[int] = []
        scores: Sequence[float] = []
        threshold: Optional[float] = None

        if all(isinstance(i, int) or not i for i in inferences):
            predictions: Sequence[int] = cast(Sequence[int], inferences)
        elif all(isinstance(i, float) or not i for i in inferences):
            scores = inferences
            if self.classification_threshold:
                if self.auto_threshold:
                    logger.warning("Both classification_threshold and auto_threshold are set. Ignoring auto_threshold")
                predictions = []
                for s in inferences:
                    predictions.append(1 if s >= self.classification_threshold else 0)
                threshold = self.classification_threshold
            elif self.auto_threshold:
                (threshold, predictions) = find_predictions_for_best_threshold(labels, inferences)
        else:
            raise ValueError("model must be a Scorer or BinaryClassifier")
        return scores, predictions, threshold

    def load_datasets(
        self,
        n: Optional[int] = None,
    ) -> Sequence[Union[BinaryClassificationDataset, MultiInputBinaryClassificationDataset]]:
        raise NotImplementedError("not implemented")

    def help(self, method_name: Optional[str] = None):
        """
        Prints the docstring of the class if no argument is provided, or prints
        the docstring of the specified method.

        Parameters:
            method_name (str, optional): The name of the method to print the docstring for. Defaults to None.
        """
        if method_name is None:
            logger.info(self.__doc__)
        else:
            # Getting the method object from the class based on the method_name string
            method = getattr(self, method_name, None)
            if method is not None:
                logger.info(method.__doc__)
            else:
                logger.info(f"No method named '{method_name}' found.")
