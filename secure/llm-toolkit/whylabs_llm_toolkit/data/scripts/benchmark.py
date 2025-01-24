import logging
import os
import re
from functools import partial
from pprint import pformat
from typing import Dict, List, Literal, Optional, Tuple, TypedDict, Union, cast
from urllib.parse import unquote

import click
import matplotlib.pyplot as plt
import numpy as np
import numpy.typing as npt
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score  # pyright: ignore[reportUnknownVariableType]
from sklearn.preprocessing import LabelBinarizer

from langkit.core.metric import MetricCreator, WorkflowOptions
from langkit.core.workflow import Workflow
from langkit.metrics.injections_chroma_twoclass import injections_twoclass_metric_chroma
from langkit.metrics.library import lib
from langkit.metrics.topic_setfit import topic_setfit_metric
from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.datasets.full_datasets.ood_eval_data import get_ood_eval_data
from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets
from whylabs_llm_toolkit.eval.benchmarks.binary_classification_benchmarks import evaluate
from whylabs_llm_toolkit.eval.evaluation_metrics import BinaryClassificationResult, ResultGroup
from whylabs_llm_toolkit.settings import reload_settings

_logger = logging.getLogger(__name__)

DEFAULT_SIZE_LIMITS = {
    Labels.injection: 1000,
    Labels.innocuous: 1000,
    Labels.code: 1000,
    Labels.medical: 1000,
    Labels.financial: 1000,
    Labels.toxic: 1000,
    Labels.hate: 1000,
    Labels.harmful: 1000,
}

CODE_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

FINANCIAL_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

MEDICAL_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

INNOCUOUS_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

HATE_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

HARMFUL_SIZE_LIMITS = DEFAULT_SIZE_LIMITS

INJECTION_SIZE_LIMITS = {
    Labels.injection: 3000,
    Labels.innocuous: 5000,
    Labels.code: 500,
    Labels.medical: 500,
    Labels.financial: 500,
    Labels.toxic: 1000,
    Labels.hate: 1000,
    Labels.harmful: 0,  # injections data has harmful examples indirectly, so it's in a gray area
}

TOXIC_SIZE_LIMITS = {
    Labels.injection: 150,
    Labels.innocuous: 150,
    Labels.code: 100,
    Labels.medical: 100,
    Labels.financial: 100,
    Labels.toxic: 500,
    Labels.hate: 250,
    Labels.harmful: 250,
}


def sanitize_filename(filename: str) -> str:
    # Decode URL-encoded characters
    decoded_filename = unquote(filename)
    # Define a pattern to match any character that is not alphanumeric, underscore, or dot
    sanitized = re.sub(r"[^\w\.-]", "_", decoded_filename)
    return sanitized


def _get_size_limits(dataset: Labels) -> Optional[Dict[Labels, int]]:
    if dataset == Labels.injection:
        return INJECTION_SIZE_LIMITS
    if dataset == Labels.medical:
        return MEDICAL_SIZE_LIMITS
    if dataset == Labels.code:
        return CODE_SIZE_LIMITS
    if dataset == Labels.financial:
        return FINANCIAL_SIZE_LIMITS
    if dataset == Labels.toxic:
        return TOXIC_SIZE_LIMITS
    if dataset == Labels.innocuous:
        return INNOCUOUS_SIZE_LIMITS
    if dataset == Labels.none:
        return DEFAULT_SIZE_LIMITS
    if dataset == Labels.hate:
        return HATE_SIZE_LIMITS
    if dataset == Labels.harmful:
        return HARMFUL_SIZE_LIMITS


_metrics_map = {
    Labels.injection: [
        "prompt.similarity.injection",
    ],
    Labels.medical: ["prompt.topics.medical", "prompt.similarity.medical"],
    Labels.code: ["prompt.topics.code", "prompt.similarity.code"],
    Labels.financial: ["prompt.topics.financial", "prompt.similarity.financial"],
    Labels.toxic: ["prompt.topics.toxic", "prompt.similarity.toxic", "prompt.toxicity.toxicity_score"],
    Labels.innocuous: ["prompt.topics.innocuous", "prompt.similarity.innocuous"],
    Labels.hate: ["prompt.topics.hate", "prompt.similarity.hate"],
    Labels.harmful: ["prompt.topics.harmful", "prompt.similarity.harmful"],
    Labels.none: ["prompt.topics.label", "prompt.topics.malicious"],
}


def _is_in_metric_map(metric: str, dataset: Labels) -> bool:
    return any([substring in metric for substring in _metrics_map[dataset]])


class Evaluator:
    def __init__(self, wf: Optional[Workflow] = None):
        if wf is None:
            self.wf = Workflow(
                metrics=[
                    lib.prompt.similarity.injection(),
                    lib.prompt.topics.medical(),
                    lib.prompt.topics.code(),
                    lib.prompt.topics.financial(),
                ]
            )
        else:
            self.wf = wf

    def get_categorical_label_results(self, dataset: Labels, inputs: List[str], batch_size: int = 100) -> Dict[str, List[str]]:
        to_return: Dict[str, List[str]] = {}
        for i in range(0, len(inputs), batch_size):
            results = self.wf.run(pd.DataFrame({"prompt": inputs[i : i + batch_size]}))
            metrics_df: pd.DataFrame = results.metrics
            for metric in metrics_df.columns.tolist():
                if _is_in_metric_map(metric, dataset):
                    metric_scores = to_return.get(metric, [])
                    metric_scores.extend([str(score) for score in results.metrics[metric].to_list()])  # pyright: ignore[reportUnknownVariableType, reportUnknownArgumentType]
                    to_return[metric] = metric_scores
        return to_return

    def get_unfiltered_score_results(self, inputs: List[str], batch_size: int = 100) -> Dict[str, List[float]]:
        to_return: Dict[str, List[float]] = {}
        exclusion_list = ["neighbor_ids", "neighbor_coordinates"]
        for i in range(0, len(inputs), batch_size):
            results = self.wf.run(pd.DataFrame({"prompt": inputs[i : i + batch_size]}))
            metrics_df: pd.DataFrame = results.metrics
            for metric in metrics_df.columns.tolist():
                if any([substring in metric for substring in exclusion_list]):
                    continue
                metric_scores = to_return.get(metric, [])
                metric_scores.extend(metrics_df[metric].to_list())  # pyright: ignore[reportUnknownArgumentType]
                to_return[metric] = metric_scores
        return to_return

    def get_score_results(self, dataset: Labels, inputs: List[str], batch_size: int = 100) -> Dict[str, List[float]]:
        to_return: Dict[str, List[float]] = {}
        unfiltered_results = self.get_unfiltered_score_results(inputs, batch_size)
        for metric in unfiltered_results:
            if _is_in_metric_map(metric, dataset):
                to_return[metric] = unfiltered_results[metric]
        return to_return

    def get_results(self, dataset: Labels, inputs: List[str], batch_size: int = 100) -> Dict[str, List[float]]:
        to_return = self.get_score_results(dataset, inputs, batch_size)

        return to_return


def evaluate_special_case_metrics(
    results: Union[Dict[str, List[float]], Dict[str, List[str]]],
    test_data: pd.DataFrame,
    beta: float,
    thresholds: Optional[Dict[str, float]],
    split_labels: bool,
) -> List[Tuple[str, ResultGroup]]:
    result_groups_list: List[Tuple[str, ResultGroup]] = []
    for metric_name in results:
        malicious_metrics = ["topic.malicious", "topics.malicious"]
        if any([name in metric_name for name in malicious_metrics]):
            class_name = "malicious"
            # apply to dataset columns - transform "toxic","hate","harmful","injection" into "malicious"
            aggregated_test_data = test_data.copy()
            aggregated_test_data["dataset"] = aggregated_test_data["dataset"].apply(  # pyright: ignore[reportUnknownMemberType]
                lambda x: "malicious"  # pyright: ignore[reportUnknownLambdaType]
                if x in ["toxic", "hate", "harmful", "injection"]
                else x
            )
            aggregated_test_data["score"] = results[metric_name]
            dataset_results = evaluate(class_name, aggregated_test_data, beta, threshold=None, split_labels=split_labels)
            result_groups_list.append((metric_name, dataset_results))
        elif "topic.label" in metric_name:
            labels: List[str] = test_data["dataset"].to_list()
            categ_results: Dict[str, List[str]] = {metric_name: cast(List[str], results[metric_name])}
            results_per_metric = evaluate_multi_class_results(categ_results, labels)
            result_groups_list.append((metric_name, results_per_metric[metric_name]))
    return result_groups_list


def evaluate_metrics(
    dataset: Labels,
    results: Dict[str, List[float]],
    test_data: pd.DataFrame,
    beta: float = 0.5,
    thresholds: Optional[Dict[str, float]] = None,
    split_labels: bool = False,
) -> List[Tuple[str, ResultGroup]]:
    result_groups_list = []
    if dataset == Labels.none:
        return evaluate_special_case_metrics(results, test_data, beta, thresholds, split_labels)
    for metric_name in results:
        threshold = thresholds.get(metric_name) if thresholds else None
        test_data["score"] = results[metric_name]
        dataset_results = evaluate(dataset.name, test_data, beta, threshold, split_labels=split_labels)
        result_groups_list.append((metric_name, dataset_results))  # pyright: ignore[reportUnknownMemberType]
    return cast(List[Tuple[str, ResultGroup]], result_groups_list)


def write_result_groups(result_groups_list: List[Tuple[str, ResultGroup]], st: SentenceTransformerEncoder, path: str):
    for metric_name, dataset_results in result_groups_list:
        pretty_results = pformat(dataset_results.to_dict(), width=80, indent=2)
        _logger.info(f"Benchmark results for {metric_name} and encoder {st.name}::::::")
        _logger.info(pretty_results)
        partial_df = pd.DataFrame(data=dataset_results.to_dict())
        partial_df = partial_df.fillna("-")  # pyright: ignore[reportUnknownMemberType]
        cleaned_metric_name = sanitize_filename(metric_name)[:80]
        partial_df.to_html(os.path.join(path, f"{cleaned_metric_name}_results.html"))  # pyright: ignore[reportUnknownMemberType]


class ResultsDict(TypedDict):
    metric_name: List[str]
    low_f1: List[float]
    medium_f1: List[float]
    high_f1: List[float]
    low_thresh: List[float]
    medium_thresh: List[float]
    high_thresh: List[float]
    support: List[Optional[int]]
    medium_accuracy: List[float]


class PartialResultsDict(TypedDict):
    metric_name: List[str]
    f1: List[float]
    threshold: List[float]
    support: List[Optional[int]]
    accuracy: List[float]


def get_partial_macro_results(
    dataset: Labels,
    results: Dict[str, List[float]],
    test_data: pd.DataFrame,
    beta: Optional[float] = None,
    thresholds: Optional[Dict[str, float]] = None,
) -> PartialResultsDict:
    result_groups_list = evaluate_metrics(dataset=dataset, results=results, test_data=test_data, beta=beta or 0.5, thresholds=thresholds)
    results_dict: PartialResultsDict = {
        "metric_name": [],
        "f1": [],
        "threshold": [],
        "support": [],
        "accuracy": [],
    }
    for i in range(len(result_groups_list)):
        metric_name = result_groups_list[i][0]
        dataset_results = result_groups_list[i][1]
        sensitivity_results = dataset_results.get_group_results("all_data")
        if sensitivity_results:
            results_dict["metric_name"].extend([metric_name])
            results_dict["f1"].extend([round(cast(float, sensitivity_results.f1), 3)])
            results_dict["threshold"].extend([round(cast(float, sensitivity_results.threshold), 3)])
            results_dict["support"].extend([sensitivity_results.support] if sensitivity_results.support else [])
            results_dict["accuracy"].extend([round(cast(float, sensitivity_results.accuracy), 3)])

    return results_dict


def calculate_weighted_avg_thresholds(ood_thresholds: ResultsDict, thresholds: ResultsDict) -> ResultsDict:
    # Ensure all lists have the same length
    list_length = len(ood_thresholds["metric_name"])
    assert all(len(v) == list_length for v in ood_thresholds.values()), "All lists in ood_thresholds must have the same length"  # pyright: ignore[reportArgumentType]
    assert all(len(v) == list_length for v in thresholds.values()), "All lists in thresholds must have the same length"  # pyright: ignore[reportArgumentType]
    assert ood_thresholds["metric_name"] == thresholds["metric_name"], "metric_name lists must match"

    result: ResultsDict = initialize_results_dict()
    for i in range(list_length):
        ood_support = ood_thresholds["support"][i]
        support = thresholds["support"][i]
        if isinstance(ood_support, int) and isinstance(support, int):
            total_support = ood_support + support
            ood_weight = ood_support / total_support
            thresh_weight = support / total_support
            result["metric_name"].append(ood_thresholds["metric_name"][i])
            result["low_thresh"].append(ood_thresholds["low_thresh"][i] * ood_weight + thresholds["low_thresh"][i] * thresh_weight)
            result["medium_thresh"].append(ood_thresholds["medium_thresh"][i] * ood_weight + thresholds["medium_thresh"][i] * thresh_weight)
            result["high_thresh"].append(ood_thresholds["high_thresh"][i] * ood_weight + thresholds["high_thresh"][i] * thresh_weight)
            result["support"].append(total_support)
    return result


def write_histograms(
    dataset: Labels, results: Dict[str, List[float]], data: pd.DataFrame, path: str, thresholds: Optional[Dict[str, float]] = None
):
    for metric_name, scores in results.items():
        threshold = thresholds.get(metric_name) if thresholds else None
        labels = (data["dataset"] == dataset.name).astype(int).to_list()
        scores = scores
        scores_positives = [score for score, label in zip(scores, labels) if label == 1]
        scores_negatives = [score for score, label in zip(scores, labels) if label == 0]
        fig, ax = plt.subplots(figsize=(10, 6))  # pyright: ignore[reportUnknownMemberType, reportUnusedVariable]

        # Plot histograms
        ax.hist(scores_negatives, bins=30, alpha=0.7, color="blue", label="Negative (0)")  # pyright: ignore[reportUnknownMemberType]
        ax.hist(scores_positives, bins=30, alpha=0.7, color="orange", label="Positive (1)")  # pyright: ignore[reportUnknownMemberType]

        # Add vertical line for threshold
        ax.axvline(x=threshold, color="red", linestyle="--", linewidth=2, label="Threshold")  # pyright: ignore[reportUnknownMemberType,reportArgumentType]

        # Customize plot
        ax.set_xlabel("Predictions")  # pyright: ignore[reportUnknownMemberType]
        ax.set_ylabel("Frequency")  # pyright: ignore[reportUnknownMemberType]
        ax.set_title("Histogram of Predictions by Label")  # pyright: ignore[reportUnknownMemberType]
        ax.legend()  # pyright: ignore[reportUnknownMemberType])

        # Display the plot
        plt.tight_layout()
        # Save the plot
        cleaned_metric_name = sanitize_filename(metric_name)[:80]
        plt.savefig(os.path.join(path, f"{cleaned_metric_name}_histogram.png"))  # pyright: ignore[reportUnknownMemberType]
    return


def get_macro_results(
    dataset: Labels, results: Dict[str, List[float]], test_data: pd.DataFrame, thresholds: Optional[ResultsDict] = None
) -> ResultsDict:
    if thresholds:
        medium_thresholds_per_metric = {
            metric: threshold for metric, threshold in zip(thresholds["metric_name"], thresholds["medium_thresh"])
        }
        low_thresholds_per_metric = {metric: threshold for metric, threshold in zip(thresholds["metric_name"], thresholds["low_thresh"])}
        high_thresholds_per_metric = {metric: threshold for metric, threshold in zip(thresholds["metric_name"], thresholds["high_thresh"])}
    else:
        medium_thresholds_per_metric = None
        low_thresholds_per_metric = None
        high_thresholds_per_metric = None
    result_groups_medium = get_partial_macro_results(dataset, results, test_data, beta=0.5, thresholds=medium_thresholds_per_metric)
    result_groups_low = get_partial_macro_results(dataset, results, test_data, beta=0.2, thresholds=low_thresholds_per_metric)
    result_groups_high = get_partial_macro_results(dataset, results, test_data, beta=1, thresholds=high_thresholds_per_metric)

    results_dict: ResultsDict = {
        "metric_name": result_groups_medium["metric_name"],
        "low_f1": result_groups_low["f1"],
        "medium_f1": result_groups_medium["f1"],
        "high_f1": result_groups_high["f1"],
        "low_thresh": result_groups_low["threshold"],
        "medium_thresh": result_groups_medium["threshold"],
        "high_thresh": result_groups_high["threshold"],
        "support": result_groups_medium["support"],
        "medium_accuracy": result_groups_medium["accuracy"],
    }
    return results_dict


def initialize_results_dict() -> ResultsDict:
    return {
        "metric_name": [],
        "low_f1": [],
        "medium_f1": [],
        "high_f1": [],
        "low_thresh": [],
        "medium_thresh": [],
        "high_thresh": [],
        "support": [],
        "medium_accuracy": [],
    }


def save_results_to_html(results_dict: ResultsDict, st: SentenceTransformerEncoder, path: str):
    results_dict["metric_name"] = [sanitize_filename(metric)[:50] for metric in results_dict["metric_name"]]
    results_df = pd.DataFrame(data=results_dict)
    results_df["encoder"] = st.name
    results_df.to_html(path)  # pyright: ignore[reportUnknownMemberType]


def evaluate_multi_class_results(results: Dict[str, List[str]], labels: List[str]) -> Dict[str, ResultGroup]:
    to_return: Dict[str, ResultGroup] = {}
    for metric_name, scores in results.items():
        y_true = labels
        y_pred = scores

        # Initialize a LabelBinarizer, which transforms each class into a one-vs-all binary problem
        lb = LabelBinarizer()
        y_true_bin = cast(npt.NDArray[np.int64], lb.fit_transform(y_true))  # pyright: ignore[reportUnknownMemberType]
        y_pred_bin = cast(npt.NDArray[np.int64], lb.transform(y_pred))  # pyright: ignore[reportUnknownMemberType]

        # Store results for each label
        results_list: List[BinaryClassificationResult] = []

        # Calculate precision, recall, and F1 for each label
        for idx, label in enumerate(lb.classes_):  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
            precision = cast(float, precision_score(y_true_bin[:, idx], y_pred_bin[:, idx]))
            recall = cast(float, recall_score(y_true_bin[:, idx], y_pred_bin[:, idx]))
            f1 = cast(float, f1_score(y_true_bin[:, idx], y_pred_bin[:, idx]))
            accuracy = accuracy_score(y_true_bin[:, idx], y_pred_bin[:, idx])
            # Append results
            class_results = BinaryClassificationResult(name=label, precision=precision, recall=recall, f1=f1, accuracy=accuracy)
            results_list.append(class_results)

        # Convert results to a pandas DataFrame
        metrics_result_group = ResultGroup(results_list)
        to_return[metric_name] = metrics_result_group
    return to_return


class MetricsResultsResolver:
    def __init__(
        self,
        st: SentenceTransformerEncoder,
        which_metrics: Dict[Labels, List[MetricCreator]],
        split: Literal["train", "eval", "test"],
        limit: Optional[int] = None,
    ):
        self.st = st
        self.which_metrics = which_metrics
        self.limit = limit
        self.split: Literal["train", "eval", "test"] = split

    def calculate_results(self) -> "MetricsResultsResolver":
        datasets = [label for label in self.which_metrics.keys()]
        all_size_limits = list(set([str(_get_size_limits(dataset)) for dataset in datasets]))
        grouped_datasets: Dict[int, List[Labels]] = {}
        for dataset in datasets:
            dataset_size_limits = _get_size_limits(dataset)
            if dataset_size_limits is not None:
                index: int = all_size_limits.index(str(dataset_size_limits))
                if index not in grouped_datasets:
                    grouped_datasets[index] = [dataset]
                else:
                    grouped_datasets[index].append(dataset)
        grouped_metrics: Dict[int, List[MetricCreator]] = {}
        for index, datasets in grouped_datasets.items():
            metrics_per_index = []
            for dataset in datasets:
                metrics = self.which_metrics[dataset]
                metrics_per_index.extend(metrics)  # pyright: ignore[reportUnknownMemberType]
            grouped_metrics[index] = metrics_per_index
        options: WorkflowOptions = {}
        WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(self.st.name))
        grouped_results: Dict[int, Dict[str, List[float]]] = {}
        grouped_data: Dict[int, pd.DataFrame] = {}
        for index, metrics in grouped_metrics.items():
            wf = Workflow(metrics=metrics, options=options)
            evaluator = Evaluator(wf)
            dataset_size_limits = _get_size_limits(grouped_datasets[index][0])
            if self.limit is not None and dataset_size_limits is not None:
                dataset_size_limits = {k: min(v, self.limit) if v >= 0 else self.limit for k, v in dataset_size_limits.items()}
            data = StandardDataset(size_filter=dataset_size_limits).get_data(self.split)
            results = evaluator.get_unfiltered_score_results(data["text"].to_list())  # pyright: ignore[reportUnknownArgumentType]
            grouped_results[index] = results
            grouped_data[index] = data
        self.datasets_per_index = grouped_datasets
        self.results_per_index = grouped_results
        self.data_per_index = grouped_data
        return self

    def get_results_per_dataset(self, dataset: Labels) -> Dict[str, List[float]]:
        for index, datasets in self.datasets_per_index.items():
            if dataset in datasets:
                to_return: Dict[str, List[float]] = {}
                unfiltered_results = self.results_per_index[index]
                for metric in unfiltered_results:
                    if _is_in_metric_map(metric, dataset):
                        to_return[metric] = unfiltered_results[metric]
                return to_return
        return {}

    def get_data_per_dataset(self, dataset: Labels) -> pd.DataFrame:
        for index, datasets in self.datasets_per_index.items():
            if dataset in datasets:
                return self.data_per_index[index]
        return pd.DataFrame()


def write_ood_special_case_results(metrics: List[MetricCreator], st: SentenceTransformerEncoder, paths: ArtifactPaths):
    data = get_ood_eval_data("malicious")
    if data is None:
        return
    malicious_data = data.get_data("test")
    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(st.name))
    wf = Workflow(metrics=metrics, options=options)
    wf_results = wf.run(pd.DataFrame({"prompt": malicious_data["text"].to_list()})).metrics
    column_names = wf_results.columns.tolist()
    results: Dict[str, List[float]] = {column_name: wf_results[column_name].to_list() for column_name in column_names}
    ood_result_groups_list = evaluate_special_case_metrics(results, malicious_data, beta=0.5, thresholds=None, split_labels=True)
    write_result_groups(ood_result_groups_list, st, paths.get_benchmark_results_path(st, "OOD"))
    return


def write_special_case_metrics(test_metrics_resolver: MetricsResultsResolver, st: SentenceTransformerEncoder, paths: ArtifactPaths):
    test_results = test_metrics_resolver.get_results_per_dataset(Labels.none)
    test_data = test_metrics_resolver.get_data_per_dataset(Labels.none)

    result_groups_list = evaluate_metrics(Labels.none, test_results, test_data)
    write_result_groups(result_groups_list, st, paths.get_benchmark_results_path(st))


def write_benchmark_results(
    name: str,
    which_metrics: Dict[Labels, List[MetricCreator]],
    st: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2,
    limit: Optional[int] = None,
    ood: bool = False,
):
    datasets = [label for label in which_metrics.keys()]
    paths = ArtifactPaths(name)
    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(st.name))
    results_dict: ResultsDict = initialize_results_dict()
    eval_metrics_resolver = MetricsResultsResolver(st, which_metrics, split="eval", limit=limit)
    test_metrics_resolver = MetricsResultsResolver(st, which_metrics, split="test", limit=limit)
    if not ood:
        eval_metrics_resolver = eval_metrics_resolver.calculate_results()
        test_metrics_resolver = test_metrics_resolver.calculate_results()
    for dataset in datasets:
        metrics = which_metrics[dataset]
        wf = Workflow(metrics=metrics, options=options)
        evaluator = Evaluator(wf)

        if not ood:
            eval_results = eval_metrics_resolver.get_results_per_dataset(dataset)
            eval_data: pd.DataFrame = eval_metrics_resolver.get_data_per_dataset(dataset)
            # Report metrics for test-split data and initial thresholds
            test_data = test_metrics_resolver.get_data_per_dataset(dataset)
            test_results = test_metrics_resolver.get_results_per_dataset(dataset)

        else:
            ood_dataset = get_ood_eval_data(dataset.name)
            if ood_dataset is None:
                continue
            eval_data = ood_dataset.get_data("test")
            eval_results = evaluator.get_results(dataset, cast(List[str], eval_data["text"].to_list()))
            # for ood, final thresholds are calculated and performance is reported on the same data
            test_data = eval_data
            test_results = eval_results

        thresholds_per_metric = get_macro_results(dataset, eval_results, eval_data)
        medium_thresholds_per_metric = {
            metric: threshold for metric, threshold in zip(thresholds_per_metric["metric_name"], thresholds_per_metric["medium_thresh"])
        }

        result_groups_list = evaluate_metrics(
            dataset, test_results, test_data, thresholds=medium_thresholds_per_metric, split_labels=False if not ood else True
        )
        write_histograms(
            dataset=dataset,
            results=test_results,
            data=test_data,
            path=paths.get_benchmark_histogram_path(st, "ID" if not ood else "OOD"),
            thresholds=medium_thresholds_per_metric,
        )
        write_result_groups(result_groups_list, st, paths.get_benchmark_results_path(st, "ID" if not ood else "OOD"))
        partial_macro_results = get_macro_results(dataset, test_results, test_data, thresholds=thresholds_per_metric)
        for key, value in partial_macro_results.items():
            results_dict[key].extend(value)  # pyright: ignore[reportUnknownMemberType]

    benchmark_results_path = os.path.join(paths.get_benchmark_results_path(st, "ID" if not ood else "OOD"), "benchmark_results.html")
    save_results_to_html(results_dict, st, benchmark_results_path)


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option(
    "--limit",
    type=int,
    required=False,
    help="An amount to limit the data to, per label. Doesn't apply to the sentence transformer fine tuning.",
    default=None,
    envvar="LIMIT",
)
@click.option(
    "-e",
    "--encoders",
    type=str,
    required=False,
    multiple=True,
    help=f"""
Which sentence transformers to use, from: {str(list([it.name for it in SentenceTransformerEncoder.__members__.values()]))}
""",
    envvar="ENCODERS",
)
def cli(name: str, limit: Optional[int] = None, encoders: Optional[List[str]] = None):
    """
    Runs the benchmarking workflow for the specified encoders, labels, and metrics.
    The thresholds for each metric are calculated using the test split of the standard dataset.
    The benchmark_results.html files contain low/medium/high sensitivity thresholds recommendations
    based on the optimal F0.5, F1, and F2 scores, respectively.
    For Out of Distribution (OOD) evaluation, the thresholds are obtained through a combination of
    ID/OOD data.
    """
    reload_settings()

    paths = ArtifactPaths(name)

    for st in get_encoder_targets(encoders):
        inj_metric: MetricCreator = partial(
            injections_twoclass_metric_chroma,
            column_name="prompt",
            local_path=paths.get_chromadb_path(st, Labels.injection, twoclass=True),
            choice=WhyLabsSupportedEncoder(st.name),
        )

        topics_list = [Labels.medical, Labels.code, Labels.financial, Labels.toxic, Labels.hate, Labels.innocuous, Labels.harmful]

        topics_similarity_metrics = [
            partial(
                topic_chroma_twoclass_metric,
                column_name="prompt",
                topic=lb,
                local_path=paths.get_chromadb_path(st, lb, twoclass=True),
            )()
            for lb in topics_list
        ]

        setfit_metrics = partial(topic_setfit_metric, column_name="prompt", local_path=paths.get_classifier_model_path(st))

        which_metrics = {
            Labels.injection: [inj_metric()],
            Labels.medical: [setfit_metrics(), lib.prompt.topics.medical()] + topics_similarity_metrics,
            Labels.code: [setfit_metrics(), lib.prompt.topics.code()] + topics_similarity_metrics,
            Labels.financial: [setfit_metrics(), lib.prompt.topics.financial()] + topics_similarity_metrics,
            Labels.toxic: [setfit_metrics(), lib.prompt.toxicity.toxicity_score()] + topics_similarity_metrics,
            Labels.hate: [setfit_metrics()] + topics_similarity_metrics,
            Labels.innocuous: [setfit_metrics()] + topics_similarity_metrics,
            Labels.harmful: [setfit_metrics()] + topics_similarity_metrics,
        }
        write_benchmark_results(name=name, which_metrics=which_metrics, st=st, limit=limit)
        write_benchmark_results(name=name, which_metrics=which_metrics, st=st, limit=limit, ood=True)

    reload_settings()


if __name__ == "__main__":
    cli()
