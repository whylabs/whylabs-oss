# pyright: reportUnknownMemberType=none
# pyright: reportUnknownVariableType=none

import warnings
from dataclasses import dataclass
from logging import getLogger
from typing import List, Optional, Sequence, Tuple, cast

import numpy as np
import sklearn.metrics
from sklearn.metrics import roc_auc_score

logger = getLogger(__name__)


def calculate_f_score(precision: float, recall: float, beta: float):
    beta_squared = beta**2
    f_score = (1 + beta_squared) * (precision * recall) / (beta_squared * precision + recall)
    return f_score


def plot_roc(fpr: Sequence[float], tpr: Sequence[float], thresholds: Sequence[float]):
    import matplotlib.pyplot as plt

    plt.figure()
    plt.plot(fpr, tpr, color="darkorange", lw=2, label="ROC curve")
    plt.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Receiver Operating Characteristic (ROC) Curve")
    plt.legend(loc="lower right")
    plt.grid(True)
    return plt


@dataclass
class MetricInput:
    labels: Sequence[int]
    scores: Optional[Sequence[float]]
    predictions: Optional[Sequence[int]]
    group_names: Optional[Sequence[str]] = None
    threshold: Optional[float] = None
    time: Optional[float] = None


@dataclass
class BinaryClassificationResult:
    name: Optional[str] = None
    auc: Optional[float] = None
    f1: Optional[float] = None
    f05: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    accuracy: Optional[float] = None
    support: Optional[int] = None
    threshold: Optional[float] = None
    time: Optional[float] = None
    roc_curve: Optional[Sequence[Sequence[float]]] = None
    imbalance_ratio: Optional[float] = None
    confusion_matrix: Optional[Sequence[Sequence[int]]] = None

    def to_dict(self):
        result = {
            "name": self.name,
            "auc": self.auc,
            "f1": self.f1,
            "f05": self.f05,
            "precision": self.precision,
            "recall": self.recall,
            "accuracy": self.accuracy,
            "support": self.support,
            "threshold": self.threshold,
            "time": self.time,
            "roc_curve.fpr": [x[0] for x in self.roc_curve] if self.roc_curve else None,
            "roc_curve.tpr": [x[1] for x in self.roc_curve] if self.roc_curve else None,
            "roc_curve.thresholds": [x[2] for x in self.roc_curve] if self.roc_curve else None,
            "confusion.tp": self.confusion_matrix[1][1] if self.confusion_matrix else None,
            "confusion.fp": self.confusion_matrix[0][1] if self.confusion_matrix else None,
            "confusion.fn": self.confusion_matrix[1][0] if self.confusion_matrix else None,
            "confusion.tn": self.confusion_matrix[0][0] if self.confusion_matrix else None,
        }
        return {k: v for k, v in result.items() if v is not None}


@dataclass(frozen=True)
class ResultGroup:
    results: List[BinaryClassificationResult]

    def get_group_results(self, group_name: str) -> Optional[BinaryClassificationResult]:
        for result in self.results:
            if result.name == group_name:
                return result
        return None

    def get_group_names(self) -> List[str]:
        return [result.name for result in self.results if result.name is not None]

    def to_dict(self):
        return [result.to_dict() for result in self.results]


def calculate_auc(labels: Sequence[int], scores: Sequence[float]) -> Optional[float]:
    try:
        auc_value = roc_auc_score(labels, scores)
    except ValueError:
        auc_value = None
        return auc_value
    if isinstance(auc_value, np.ndarray) and auc_value.size == 1:
        auc_value = float(auc_value)  # pyright: ignore[reportUnknownArgumentType]
    elif isinstance(auc_value, (int, float)):
        pass  # auc_value is already a valid type
    else:
        raise ValueError("auc must be a float or None")
    return auc_value


_SklearnMetricType = Tuple[float, float, float, int]


def calculate_binary_f1_precision_recall(labels: Sequence[int], predictions: Sequence[int]) -> _SklearnMetricType:
    return cast(_SklearnMetricType, sklearn.metrics.precision_recall_fscore_support(labels, predictions, average="binary"))


def calculate_binary_f05_precision_recall(labels: Sequence[int], predictions: Sequence[int]) -> _SklearnMetricType:
    return cast(_SklearnMetricType, sklearn.metrics.precision_recall_fscore_support(labels, predictions, average="binary", beta=0.5))


def calculate_binary_classification_accuracy(labels: Sequence[int], predictions: Sequence[int]):
    return sklearn.metrics.accuracy_score(labels, predictions)


def find_predictions_for_best_threshold(labels: Sequence[int], scores: Sequence[float], beta=0.5) -> Tuple[float, Sequence[int]]:
    precision, recall, thresholds = sklearn.metrics.precision_recall_curve(labels, scores)
    warnings.filterwarnings("ignore", category=RuntimeWarning, message="invalid value encountered in divide")
    beta_squared = beta**2
    f_scores = (1 + beta_squared) * (precision * recall) / (beta_squared * precision + recall)
    f_scores[np.isnan(f_scores)] = 0
    max_f_index = f_scores.argmax()
    best_threshold = thresholds[max_f_index]
    best_f = f_scores[max_f_index]
    best_precision = precision[max_f_index]
    best_recall = recall[max_f_index]
    logger.debug("Threshold Detection Results:")
    logger.debug(f"Best threshold: {best_threshold}, Best F_{beta}: {best_f}, Best Precision: {best_precision}, Best Recall: {best_recall}")
    predictions = [1 if s >= best_threshold else 0 for s in scores]

    return (best_threshold, predictions)


def confusion_matrix(labels: Sequence[int], predictions: Sequence[int]) -> Sequence[Sequence[int]]:
    tp = sum([1 for label, pred in zip(labels, predictions) if label == 1 and pred == 1])
    fp = sum([1 for label, pred in zip(labels, predictions) if label == 0 and pred == 1])
    fn = sum([1 for label, pred in zip(labels, predictions) if label == 1 and pred == 0])
    tn = sum([1 for label, pred in zip(labels, predictions) if label == 0 and pred == 0])
    return [[tn, fp], [fn, tp]]


def calculate_group_results(
    group_names: Sequence[str], labels: Sequence[int], predictions: Sequence[int], threshold: Optional[float] = None
) -> List[BinaryClassificationResult]:
    results: List[BinaryClassificationResult] = []
    groups = set(group_names)
    for group in groups:
        group_indices = [i for i, name in enumerate(group_names) if name == group]
        group_labels = [labels[i] for i in group_indices]
        group_predictions = [predictions[i] for i in group_indices]
        conf_results = confusion_matrix(group_labels, group_predictions)
        if all(group_labels):
            recall = sum(group_predictions) / sum(group_labels)
            partial_result = BinaryClassificationResult(
                name=group, recall=recall, threshold=threshold, support=len(group_labels), confusion_matrix=conf_results
            )
            results.append(partial_result)
        elif not any(group_labels):
            precision = 1 - sum(group_predictions) / len(group_labels)
            partial_result = BinaryClassificationResult(
                name=group, precision=precision, threshold=threshold, support=len(group_labels), confusion_matrix=conf_results
            )
            results.append(partial_result)
        else:
            group_precision, group_recall, group_f1, _ = (
                calculate_binary_f1_precision_recall(group_labels, group_predictions) if group_predictions else (None, None, None, None)
            )
            group_f05 = calculate_f_score(group_precision, group_recall, 0.5) if group_precision and group_recall else None
            partial_result = BinaryClassificationResult(
                name=group,
                precision=group_precision,
                recall=group_recall,
                f1=group_f1,
                f05=group_f05,
                threshold=threshold,
                support=len(group_labels),
                confusion_matrix=conf_results,
            )
            results.append(partial_result)
    return results


def calculate_binary_classification_results(
    metric_input: MetricInput,
    plots: bool = False,
) -> ResultGroup:
    labels = metric_input.labels
    scores = metric_input.scores
    predictions = metric_input.predictions
    threshold = metric_input.threshold
    time = metric_input.time
    group_names = metric_input.group_names
    results: List[BinaryClassificationResult] = []
    if predictions is None:
        raise ValueError("Predictions must be provided.")
    support = len(labels)
    len_positive = sum(labels)
    len_negative = support - len_positive
    imbalance_ratio = len_positive / len_negative if len_negative > 0 else -1
    auc = calculate_auc(labels, scores) if scores else None
    conf_results = confusion_matrix(labels, predictions)
    if plots and scores is not None:
        fpr, tpr, thresholds = sklearn.metrics.roc_curve(labels, scores)
        roc_curve = list(zip(fpr, tpr, thresholds))
    else:
        roc_curve = None
    precision, recall, f1, _ = calculate_binary_f1_precision_recall(labels, predictions) if predictions else (None, None, None, None)
    _, _, f05, _ = calculate_binary_f05_precision_recall(labels, predictions) if predictions else (None, None, None, None)
    acc = calculate_binary_classification_accuracy(labels, predictions) if predictions else None
    all_data_results = BinaryClassificationResult(
        name="all_data",
        auc=auc,
        roc_curve=roc_curve,
        f1=f1 if isinstance(f1, float) else None,
        f05=f05 if isinstance(f05, float) else None,
        precision=precision if isinstance(precision, float) else None,
        recall=recall if isinstance(recall, float) else None,
        accuracy=acc if isinstance(acc, float) else None,
        time=time,
        support=support,
        imbalance_ratio=imbalance_ratio,
        confusion_matrix=conf_results,
        threshold=threshold,
    )
    results.append(all_data_results)
    if group_names is not None:
        partial_results = calculate_group_results(group_names, labels, predictions, threshold)
        group_precisions = [result.precision for result in partial_results if result.precision is not None]
        group_recalls = [result.recall for result in partial_results if result.recall is not None]
        results.extend(partial_results)
        macro_recall = sum(group_recalls) / len(group_recalls) if group_recalls else None
        macro_precision = sum(group_precisions) / len(group_precisions) if group_precisions else None
        macro_f05 = calculate_f_score(macro_precision, macro_recall, 0.5) if macro_precision and macro_recall else None
        macro_f1 = calculate_f_score(macro_precision, macro_recall, 1.0) if macro_precision and macro_recall else None
        all_data_macro_results = BinaryClassificationResult(
            name="all_data_macro",
            f1=macro_f1 if isinstance(macro_f1, float) else None,
            f05=macro_f05 if isinstance(macro_f05, float) else None,
            precision=macro_precision if isinstance(macro_precision, float) else None,
            recall=macro_recall if isinstance(macro_recall, float) else None,
            threshold=threshold,
        )
        results.append(all_data_macro_results)
    return ResultGroup(results)
