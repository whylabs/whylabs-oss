import logging
import time
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import cached_property
from itertools import groupby
from typing import Any, Dict, Generator, List, Mapping, Optional, Set, Tuple, Union, cast, overload

import pandas as pd
from typing_extensions import NotRequired, TypedDict

from langkit.core.context import Context, ContextDependency
from langkit.core.generator_value import GeneratorValue
from langkit.core.metric import (
    Metric,
    MetricCreator,
    MetricResult,
    SingleMetric,
    SingleMetricResult,
    WorkflowMetricConfigBuilder,
)
from langkit.core.metric_runner import MetricRun, MetricRunSingle, MetricsRunner
from langkit.core.validation import ValidationResult, Validator

logger = logging.getLogger(__name__)


class InputContextItem(TypedDict):
    content: str
    metadata: NotRequired[Dict[str, str]]


class InputContext(TypedDict):
    entries: List[InputContextItem]


class Row(TypedDict):
    prompt: NotRequired[str]
    response: NotRequired[str]
    context: NotRequired[InputContext]


@dataclass(frozen=True)
class RunPerf:
    init_total_sec: float
    metrics_time_sec: Dict[str, float]
    metrics_total_sec: float
    context_time_sec: Dict[str, float]
    context_total_sec: float
    validation_total_sec: float
    workflow_total_sec: float


@dataclass(frozen=True)
class WorkflowResult:
    metrics: pd.DataFrame
    validation_results: ValidationResult
    perf_info: RunPerf
    outputs: Optional[Dict[str, Dict[str, Any]]] = None

    def get_failed_ids(self) -> List[str]:
        return list(set([it.id for it in self.validation_results.report]))

    def get_failed_rows(self) -> pd.DataFrame:
        return self.metrics.loc[self.get_failed_ids()]


# Basically, any side effect that doesn't mutate the inputs is fine here
class Callback(ABC):
    @abstractmethod
    def post_validation(
        self,
        df: pd.DataFrame,
        metric_results: Mapping[str, MetricResult],
        results: pd.DataFrame,
        validation_results: List[ValidationResult],
    ) -> None:
        # Can send a notification or call a webhook or log or whatever
        pass


@dataclass(frozen=True)
class MetricFilterOptions:
    by_required_inputs: Optional[List[List[str]]] = None
    allow_empty_results: bool = True


@dataclass(frozen=True)
class RunOptions:
    metric_filter: Optional[MetricFilterOptions] = None
    remote_metric_timeout_sec: float = 20


@dataclass
class MetricRunYield:
    metric_time: Tuple[str, float]
    metric_result: Tuple[str, SingleMetricResult]
    outputs: Optional[Tuple[str, Dict[str, Any]]]


def _group_metrics_by_remote(metrics: List[Metric]):
    return groupby(metrics, key=lambda metric: metric.remote)


def _get_metric_name(metric: Metric) -> str:
    return metric.name if isinstance(metric, SingleMetric) else ",".join(metric.names)


class Workflow:
    def __init__(
        self,
        metrics: List[MetricCreator],
        callbacks: Optional[List[Callback]] = None,
        validators: Optional[List[Validator]] = None,
        lazy_init=False,
        cache_assets=True,
        options: Dict[str, Any] = {},
    ) -> None:
        """
        Args:
            metrics: A list of metrics to evaluate.
            validators: A list of validators to run after the workflow is complete.
            callbacks: A list of callbacks to run after the workflow is complete.
            lazy_init: If True, the metrics will not be initialized until the first call to run.
            cache_assets: If True, the assets required for the metrics will be cached during inititialization.
        """
        self.callbacks = callbacks or []

        metrics_config = WorkflowMetricConfigBuilder(options=options).add(metrics).build()
        grouped = {key: list(group) for key, group in _group_metrics_by_remote(metrics_config.metrics)}
        self._remote_metrics = grouped.get(True, [])
        self._local_metrics = grouped.get(False, [])

        self.validators = validators or []
        self._initialized = False
        self._cache_assets = cache_assets
        self._options = options

        context_dependencies: List[ContextDependency[Any]] = []
        for metric in self._metrics:
            dependencies = metric.context_dependencies or []
            # TODO update this to account for further dependency nested. We don't need iet yet.
            for dependency in dependencies:
                # make sure we add the dependencies dependencies before the dependency itself
                # so it executes first
                context_dependencies.extend(dependency.get_dependencies())

            context_dependencies.extend(dependencies)

        self._context_dependencies = list(dict.fromkeys(context_dependencies))

        # make sure that none of the remaining context_dependencies have the same name
        context_dependency_names = [dependency.name() for dependency in self._context_dependencies]
        if len(context_dependency_names) != len(set(context_dependency_names)):
            raise ValueError(f"Context dependencies must have unique names. Found duplicates: {context_dependency_names}")

        if not lazy_init:
            self.init()

    @cached_property
    def _metrics(self) -> List[Metric]:
        return self._remote_metrics + self._local_metrics

    def init(self) -> None:
        if self._initialized:
            return

        for dependency in self._context_dependencies:
            if self._cache_assets:
                logger.debug("Executing context dependency %s cache_assets()", dependency.name)
                dependency.cache_assets()

            logger.debug("Executing context dependency %s init()", dependency.name)
            dependency.init()

        # TODO Maybe we should keep track of which already were initialized and only init the ones that weren't in this pipeline?
        # I prefer init just be idempotent but it might be hard for people to get right.
        metric_names: Set[str] = set()
        for metric in self._metrics:
            if self._cache_assets:
                logger.debug("Executing metric %s cache_assets()", _get_metric_name(metric))
                metric.do_cache_assets()

            if metric.init:
                logger.debug("Executing metric %s init()", _get_metric_name(metric))
                metric.do_initialize()

            if isinstance(metric, SingleMetric):
                metric_names.add(metric.name)
            else:
                metric_names.update(metric.names)

        for validator in self.validators:
            targets = validator.get_target_metric_names()
            if not set(targets).issubset(metric_names):
                raise ValueError(
                    f"Validator {validator} has target metric names ({targets}) but this workflow is "
                    f"only generating metrics for these: {metric_names}"
                )

        self._initialized = True

    def _condense_metric_results(self, metric_results: Dict[str, SingleMetricResult]) -> pd.DataFrame:
        full_df = pd.DataFrame()
        for metric_name, result in metric_results.items():
            full_df[metric_name] = result.metrics

        return full_df

    def _condense_validation_results(self, validation_results: List[ValidationResult]) -> ValidationResult:
        result = ValidationResult()
        for validation_result in validation_results:
            result.report.extend(validation_result.report)
        return result

    def get_metric_names(self) -> List[str]:
        names: List[str] = []
        for metric in self._metrics:
            if isinstance(metric, SingleMetric):
                names.append(metric.name)
            else:
                names.extend(metric.names)
        return names

    def get_metric_metadata(self) -> Dict[str, Dict[str, Any]]:
        metadata: Dict[str, Dict[str, Any]] = {}
        for metric in self._metrics:
            if metric.metadata:
                if isinstance(metric, SingleMetric):
                    metadata[metric.name] = metric.metadata()
                else:
                    for name in metric.names:
                        metadata[name] = metric.metadata()
        return metadata

    @overload
    def run(self, data: pd.DataFrame, options: Optional[RunOptions] = None) -> WorkflowResult:
        """
        This form is intended for batch inputs,
        where the input is a pandas DataFrame.
        """
        ...

    @overload
    def run(self, data: Row, options: Optional[RunOptions] = None) -> WorkflowResult:
        """
        This form is intended for single row inputs,
        where the input is a dictionary with the keys "prompt" and "response".
        """
        ...

    @overload
    def run(self, data: Dict[str, str], options: Optional[RunOptions] = None) -> WorkflowResult:
        """
        This form doesn't assume the "prompt" and "response" key names.
        This would be required in cases where the user wants to use different
        column names, for example "question" and "answer", or "input" and "output".
        """
        ...

    def _step_setup_context(self, inputs: pd.DataFrame):
        context = Context()
        for dependency in self._context_dependencies:
            context_dependency_start = time.perf_counter()
            dependency.populate_request(context, inputs)
            times = (dependency.name(), round(time.perf_counter() - context_dependency_start, 3))
            yield times
        return context

    def _step_filter_metrics(self, metrics: List[Metric], filter: MetricFilterOptions) -> List[Metric]:
        if not metrics:
            return []

        if filter.by_required_inputs:
            by_required_inputs_set = frozenset([frozenset(x) for x in filter.by_required_inputs])
            metrics_to_run = [metric for metric in metrics if frozenset(metric.input_names) in by_required_inputs_set]
        else:
            metrics_to_run = metrics

        return metrics_to_run

    @cached_property
    def _executor(self):
        return ThreadPoolExecutor()

    def __del__(self):
        if hasattr(self, "_executor"):
            self._executor.shutdown(wait=False)

    def run(self, data: Union[pd.DataFrame, Row, Dict[str, str]], options: Optional[RunOptions] = None) -> WorkflowResult:
        start = time.perf_counter()
        init_start = time.perf_counter()
        self.init()
        init_end = time.perf_counter() - init_start

        if not isinstance(data, pd.DataFrame):
            if not is_dict_input(data):
                raise ValueError("Input must be a pandas DataFrame or a dictionary with string keys and string values")
            df = pd.DataFrame([data])
        else:
            df = data

        # Setup context
        all_context_start = time.perf_counter()
        gen = GeneratorValue(self._step_setup_context(df))
        context_dependency_times: List[Tuple[str, float]] = [time for time in gen]
        context = gen.value
        all_context_end = time.perf_counter() - all_context_start

        # Filter metrics
        filter = options.metric_filter if options and options.metric_filter else None
        if filter:
            remote_metrics_to_run = self._step_filter_metrics(self._remote_metrics, filter)
            local_metrics_to_run = self._step_filter_metrics(self._local_metrics, filter)

            if not remote_metrics_to_run and not local_metrics_to_run and not filter.allow_empty_results:
                raise ValueError(
                    "The metric filter options filtered out all of the metrics. filters:"
                    f"{filter} did not match any requirements for metrics {self.get_metric_names()}. "
                    "If this was intentional then you should set allow_empty_results=True in the run options. "
                    "This filter filters by the required inputs of the metrics."
                )
        else:
            remote_metrics_to_run = self._remote_metrics
            local_metrics_to_run = self._local_metrics

        # Run metrics
        metric_results: Dict[str, SingleMetricResult] = {}
        outputs: Dict[str, Dict[str, Any]] = {}
        all_metrics_start = time.perf_counter()
        metric_times: List[Tuple[str, float]] = []

        runner = MetricsRunner(timeout_sec=options.remote_metric_timeout_sec if options else 20)

        def _run_metrics(gen: Generator[MetricRun, Any, None]):
            for result in gen:
                metric_times.append(result.metric_time)
                if result.outputs:
                    outputs[result.outputs[0]] = result.outputs[1]

                if isinstance(result, MetricRunSingle):
                    metric_results[result.metric_result[0]] = result.metric_result[1]
                else:
                    for metric_result in result.metric_result:
                        metric_results[metric_result[0]] = metric_result[1]

        # Run remote metrics in parallel first, then do the cpu bound ones in serial
        _run_metrics(runner.step_run_parallel(self._executor, remote_metrics_to_run, df, context))
        _run_metrics(runner.step_run_serial(local_metrics_to_run, df, context))
        all_metrics_end = time.perf_counter() - all_metrics_start

        # Validation
        condensed = self._condense_metric_results(metric_results)
        if "id" not in df.columns:
            condensed["id"] = df.index.astype(str)  # pyright: ignore[reportUnknownMemberType]
        else:
            condensed["id"] = df["id"]

        # TODO set column names `metric` and `value`
        full_df = condensed.copy()  # guard against mutations
        validation_results: List[ValidationResult] = []
        all_validators_start = time.perf_counter()
        for validator in self.validators:
            validator_columns = validator.get_target_metric_names()
            # make sure that all of the columns that the validator needs are present in the input dataframe
            if not set(validator_columns).issubset(condensed.columns):
                logger.debug(
                    f"Skipping validator {validator} because it requires columns {validator_columns } "
                    f"which are not present in the input dataframe"
                )
                continue

            # Only pass the series that the validator asks for to the validator. This ensrues that the target names in the validator
            # actually mean something so we can use them for valdation.
            target_subset = condensed[validator.get_target_metric_names() + ["id"]]
            result2 = validator.validate_result(target_subset)
            if result2 and result2.report:
                validation_results.append(result2)

        all_validators_end = time.perf_counter() - all_validators_start

        # Post validation hook
        for callback in self.callbacks:
            try:
                callback.post_validation(df.copy(), metric_results, full_df.copy(), validation_results)
            except Exception as e:
                logger.exception(f"Callback {callback} failed with exception {e}")

        # Performance
        run_perf = RunPerf(
            metrics_time_sec=dict(metric_times),
            workflow_total_sec=round(time.perf_counter() - start, 3),
            validation_total_sec=round(all_validators_end, 3),
            metrics_total_sec=round(all_metrics_end, 3),
            context_time_sec=dict(context_dependency_times),
            context_total_sec=round(all_context_end, 3),
            init_total_sec=round(init_end, 3),
        )

        return WorkflowResult(full_df, self._condense_validation_results(validation_results), perf_info=run_perf, outputs=outputs)


def is_input_context_item(variable: object) -> bool:
    if not isinstance(variable, dict):
        return False

    variable = cast(InputContextItem, variable)
    return "content" in variable and ("metadata" in variable or len(variable) == 1)


def is_input_context(variable: object) -> bool:
    if not isinstance(variable, dict):
        return False
    if "entries" not in variable:
        return False

    if not isinstance(variable["entries"], list):
        return False

    variable = cast(InputContext, variable)
    if len(variable) != 1:
        return False

    return all(is_input_context_item(value) for value in variable["entries"])


def is_dict_input(variable: object) -> bool:
    if not isinstance(variable, dict):
        return False
    # Check if all values in the dictionary are strings
    return all(isinstance(value, str) or is_input_context(value) for value in variable.values())  # pyright: ignore[reportUnknownArgumentType,reportUnknownVariableType]
