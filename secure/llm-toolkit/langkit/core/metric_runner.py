import inspect
import logging
import time
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Dict, Generator, List, Optional, Tuple, Union, cast

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import (
    Metric,
    MetricResult,
    MultiEvaluate,
    MultiEvaluateWithContext,
    MultiMetric,
    MultiMetricResult,
    SingleEvaluate,
    SingleEvaluateWithContext,
    SingleMetric,
    SingleMetricResult,
)

logger = logging.getLogger(__name__)


@dataclass
class MetricRunSingle:
    metric_time: Tuple[str, float]
    outputs: Optional[Tuple[str, Dict[str, Any]]]
    metric_result: Tuple[str, SingleMetricResult]


@dataclass
class MetricRunMulti:
    metric_time: Tuple[str, float]
    outputs: Optional[Tuple[str, Dict[str, Any]]]
    metric_result: List[Tuple[str, SingleMetricResult]]


MetricRun = Union[MetricRunSingle, MetricRunMulti]


@dataclass
class MetricsRunner:
    timeout_sec: float

    def _step_run_single_metric(self, metric: SingleMetric, inputs: pd.DataFrame, context: Context) -> MetricRunSingle:
        param_count = len(inspect.signature(metric.evaluate).parameters)

        if param_count == 2:
            fn = cast(SingleEvaluateWithContext, metric.evaluate)
            metric_start = time.perf_counter()
            result = fn(inputs, context)
            metric_time = (metric.name, round(time.perf_counter() - metric_start, 3))
        else:
            fn = cast(SingleEvaluate, metric.evaluate)
            metric_start = time.perf_counter()
            result = fn(inputs)
            metric_time = (metric.name, round(time.perf_counter() - metric_start, 3))

        self._validate_evaluate(inputs, metric, result)
        metric_result = (metric.name, result)
        outputs = (metric.name, result.outputs) if result.outputs else None
        return MetricRunSingle(metric_time=metric_time, metric_result=metric_result, outputs=outputs)

    def _step_run_multi_metrics(self, metric: MultiMetric, inputs: pd.DataFrame, context: Context) -> MetricRunMulti:
        # MultiMetrics are basically just converted into single metrics asap.
        param_count = len(inspect.signature(metric.evaluate).parameters)
        metric_names = ",".join(metric.names)
        if param_count == 2:
            fn = cast(MultiEvaluateWithContext, metric.evaluate)
            metric_start = time.perf_counter()
            result = fn(inputs, context)
            metric_time = (metric_names, round(time.perf_counter() - metric_start, 3))
        else:
            fn = cast(MultiEvaluate, metric.evaluate)
            metric_start = time.perf_counter()
            result = fn(inputs)
            metric_time = (metric_names, round(time.perf_counter() - metric_start, 3))

        self._validate_evaluate(inputs, metric, result)
        output = (metric_names, result.outputs) if result.outputs else None

        results: List[Tuple[str, SingleMetricResult]] = []
        for metric_name, metric_result in zip(metric.names, result.metrics):
            single_metric = SingleMetricResult(metric_result)
            metric_result = (metric_name, single_metric)
            results.append(metric_result)
        return MetricRunMulti(metric_time=metric_time, metric_result=results, outputs=output)

    def step_run_serial(self, metrics: List[Metric], inputs: pd.DataFrame, context: Context) -> Generator[MetricRun, Any, None]:
        for metric in metrics:
            # check that the dataframe has the metric.input_name present, or else skip
            if not all([input_name in inputs.columns for input_name in metric.input_names]):
                logger.debug(f"Skipping metric {metric} because {metric.input_names} is not present in the input dataframe")
                continue

            if isinstance(metric, SingleMetric):
                yield self._step_run_single_metric(metric, inputs, context)
            else:
                yield self._step_run_multi_metrics(metric, inputs, context)

    def step_run_parallel(
        self, executor: ThreadPoolExecutor, metrics: List[Metric], inputs: pd.DataFrame, context: Context
    ) -> Generator[MetricRun, Any, None]:
        futures: List[Future[MetricRun]] = []
        for metric in metrics:
            # check that the dataframe has the metric.input_name present, or else skip
            if not all([input_name in inputs.columns for input_name in metric.input_names]):
                logger.debug(f"Skipping metric {metric} because {metric.input_names} is not present in the input dataframe")
                continue

            if isinstance(metric, SingleMetric):
                futures.append(executor.submit(self._step_run_single_metric, metric, inputs, context))
            else:
                futures.append(executor.submit(self._step_run_multi_metrics, metric, inputs, context))

        for future in as_completed(futures, timeout=self.timeout_sec):
            yield future.result()

    def _validate_evaluate(self, input_df: pd.DataFrame, metric: Metric, metric_result: MetricResult) -> None:
        """
        Validate the oultput of the metrics
        """

        if isinstance(metric, SingleMetric):
            if len(input_df) != len(metric_result.metrics):
                assert isinstance(metric_result, SingleMetricResult)
                raise ValueError(
                    f"""Expected {len(input_df)} rows in the output of metric {metric.name} but got {len(metric_result.metrics)}.
                    There should be one output row per input row.
                    """
                )
        else:
            assert isinstance(metric_result, MultiMetricResult)
            if len(input_df) != len(metric_result.metrics[0]):
                raise ValueError(
                    f"""Expected {len(input_df)} rows in the output of metric {metric.names} but got {len(metric_result.metrics[0])}.
                    There should be one output row per input row.
                    """
                )
            if len(metric.names) != len(metric_result.metrics):
                raise ValueError(
                    f"""Expected {len(metric.names)} columns in the output of metric {metric.names} but got {len(metric_result.metrics)}.
                    There should be an output column for each metric name.
                    """
                )

        if isinstance(metric_result, MultiMetricResult):
            for result in metric_result.metrics:
                assert len(input_df) == len(result)
