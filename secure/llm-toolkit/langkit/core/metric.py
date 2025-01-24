from __future__ import annotations

import inspect
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterator, List, Optional, Sequence, TypeVar, Union, cast

import numpy as np
import pandas as pd

from langkit.core.context import Context, ContextDependency
from langkit.metrics.util import LazyInit


# TODO make this generic and add a filter ability to ensure that it only delivers the things
# you want instead of a bunch of Any
class UdfInput:
    """
    Utility class for iterating over the input data to a UDF row by row.
    """

    def __init__(self, text: Union[pd.DataFrame, Dict[str, List[Any]]]) -> None:
        self.text = text

    def iter_column_rows(self, column_name: str) -> Iterator[Any]:
        if column_name not in self.text:
            return iter([])

        if isinstance(self.text, pd.DataFrame):
            col = cast("pd.Series[Any]", self.text[column_name])
            return iter(col)
        else:
            return iter(self.text[column_name])

    def to_numpy(self, column_name: str) -> np.ndarray[Any, Any]:
        if column_name not in self.text:
            raise ValueError(f"Column {column_name} not found in {self.text}")

        if isinstance(self.text, pd.DataFrame):
            col = cast("pd.Series[Any]", self.text[column_name])
            return cast(np.ndarray[Any, Any], col.to_numpy())  # pyright: ignore[reportUnknownMemberType]
        else:
            return np.array(self.text[column_name])

    def to_list(self, column_name: str) -> List[Any]:
        if column_name not in self.text:
            raise KeyError(f"Column {column_name} not found in {self.text}")

        if isinstance(self.text, pd.DataFrame):
            col = cast("pd.Series[Any]", self.text[column_name])
            return col.to_list()

        return self.text[column_name]


MetricResultType = Union[
    Sequence[Optional[int]],
    Sequence[Optional[float]],
    Sequence[Optional[str]],
    Sequence[int],
    Sequence[float],
    Sequence[str],
    Sequence["MetricResultType"],
]


@dataclass(frozen=True)
class SingleMetricResult:
    """
    This is the type that all of the UDFs should return.
    """

    metrics: MetricResultType
    outputs: Optional[Dict[str, Any]] = None


@dataclass(frozen=True)
class MultiMetricResult:
    """
    This is the type that all of the UDFs should return.
    """

    metrics: Sequence[MetricResultType]
    outputs: Optional[Dict[str, Any]] = None


MetricResult = Union[SingleMetricResult, MultiMetricResult]


SingleEvaluateWithContext = Callable[[pd.DataFrame, Context], SingleMetricResult]
SingleEvaluate = Callable[[pd.DataFrame], SingleMetricResult]


def invoke_evaluate(
    evaluate: Union[SingleEvaluateWithContext, SingleEvaluate], text: pd.DataFrame, context: Optional[Context] = None
) -> SingleMetricResult:
    param_count = len(inspect.signature(evaluate).parameters)
    if param_count == 2:
        if not context:
            raise ValueError("Context is required for this evaluate function")
        fn = cast(SingleEvaluateWithContext, evaluate)
        return fn(text, context)
    else:
        fn = cast(SingleEvaluate, evaluate)
        return fn(text)


OptionsT = TypeVar("OptionsT")
WorkflowOptions = Dict[str, Any]


def call_options_fn(fn: Union[Callable[[], OptionsT], Callable[[WorkflowOptions], OptionsT]], options: Dict[str, Any]) -> OptionsT:
    signature = inspect.signature(fn)
    # Filtering out the kind==VAR_KEYWORD ignores the ones that use special **kwargs arguments, which we don't actually use or care
    # about in the workflow. We only ever call metrics with 0 or 1 options so we just ignore that case.
    required_args = [
        param for param in signature.parameters.values() if param.default is param.empty and not param.kind == inspect.Parameter.VAR_KEYWORD
    ]

    if len(required_args) == 0:
        return cast(Callable[[], OptionsT], fn)()
    else:
        return cast(Callable[[WorkflowOptions], OptionsT], fn)(options)


@dataclass
class SingleMetric:
    name: str  # Basically the output name
    input_names: List[str]
    evaluate: Union[SingleEvaluateWithContext, SingleEvaluate]
    init: Optional[Callable[[], None]] = None
    cache_assets: Optional[Callable[[], None]] = None
    context_dependencies: Optional[List[ContextDependency[Any]]] = None
    metadata: Optional[Callable[[], Dict[str, Any]]] = None
    remote: bool = False

    _is_init: bool = False
    _is_cached: bool = False

    def do_initialize(self) -> None:
        if not self._is_init:
            if self.init:
                self.init()
            self._is_init = True

    def do_cache_assets(self) -> None:
        if not self._is_cached:
            if self.cache_assets:
                self.cache_assets()
            self._is_cached = True


MultiEvaluateWithContext = Callable[[pd.DataFrame, Context], MultiMetricResult]
MultiEvaluate = Callable[[pd.DataFrame], MultiMetricResult]


@dataclass
class MultiMetric:
    # Splitting the metric into single/multi can be a bit verbose, but it lets us know all of the metric names
    # that are going to be generated upfront without having to evaluate all of the metrics to find out.
    names: List[str]
    input_names: List[str]
    evaluate: Union[MultiEvaluateWithContext, MultiEvaluate]
    init: Optional[Callable[[], None]] = None
    cache_assets: Optional[Callable[[], None]] = None
    context_dependencies: Optional[List[ContextDependency[Any]]] = None
    metadata: Optional[Callable[[], Dict[str, Any]]] = None
    remote: bool = False

    _is_init: bool = False
    _is_cached: bool = False

    def do_initialize(self) -> None:
        if not self._is_init:
            if self.init:
                self.init()
            self._is_init = True

    def do_cache_assets(self) -> None:
        if not self._is_cached:
            if self.cache_assets:
                self.cache_assets()
            self._is_cached = True


def invoke_evaluate_multi(
    evaluate: Union[MultiEvaluateWithContext, MultiEvaluate], text: pd.DataFrame, context: Optional[Context] = None
) -> MultiMetricResult:
    param_count = len(inspect.signature(evaluate).parameters)
    if param_count == 2:
        if not context:
            raise ValueError("Context is required for this evaluate function")
        fn = cast(MultiEvaluateWithContext, evaluate)
        return fn(text, context)
    else:
        fn = cast(MultiEvaluate, evaluate)
        return fn(text)


Metric = Union[SingleMetric, MultiMetric]

# Don't allow a raw Metric to be a Module because wrapping it in a callable of some kind
# lets us defer/manage side effects.
MetricCreator = Union[
    List["MetricCreator"],
    Callable[[], "MetricCreator"],
    Callable[[WorkflowOptions], "MetricCreator"],
    # The versions that take in WorkflowOptions allow metrics to get additional configuration options as a dict
    # that are passed into the workflow that creates them.
    Callable[[], List["MetricCreator"]],
    Callable[[WorkflowOptions], List["MetricCreator"]],
    Callable[[], Metric],
    Callable[[WorkflowOptions], Metric],
    Callable[[], List[Metric]],
    Callable[[WorkflowOptions], List[Metric]],
    List[Union[Callable[[], Metric], Callable[[WorkflowOptions], Metric]]],
]


@dataclass(frozen=True)
class WorkflowMetricConfig:
    metrics: List[Metric]


class MetricNameCapture:
    """
    Nice little wrapper that evaluates metric creators for you under the hood while allowing
    you get get the metric name references.
    """

    def __init__(self, creator: MetricCreator) -> None:
        self._creator = creator
        self._metrics = LazyInit(lambda: WorkflowMetricConfigBuilder().add(self._creator).build().metrics)
        self._metric_names = LazyInit(lambda: MetricNameCapture.__get_metric_names(self._metrics.value))

    @staticmethod
    def __get_metric_names(metrics: List[Metric]) -> List[str]:
        names: List[str] = []
        for metric in metrics:
            if isinstance(metric, SingleMetric):
                names.append(metric.name)
            else:
                names.extend(metric.names)
        return names

    def __call__(self) -> MetricCreator:
        return lambda: self._metrics.value

    @property
    def metric_names(self) -> List[str]:
        return self._metric_names.value


class WorkflowMetricConfigBuilder:
    def __init__(self, metric_creators: Optional[List[MetricCreator]] = None, options: WorkflowOptions = {}) -> None:
        super().__init__()
        self._modules: List[MetricCreator] = metric_creators or []
        self._options = options

    def add(self, module: MetricCreator) -> "WorkflowMetricConfigBuilder":
        if isinstance(module, list):
            self._modules.extend(module)
        elif callable(module):
            self._modules.append(module)
        else:
            self._modules.append(module)

        return self

    def _build_metrics(self, modules: List[MetricCreator]) -> List[Metric]:
        schemas: List[Metric] = []
        for module in modules:
            if callable(module):
                schema = call_options_fn(module, self._options)
                if isinstance(schema, SingleMetric) or isinstance(schema, MultiMetric):
                    schemas.append(schema)
                elif isinstance(schema, list):
                    for s in schema:
                        if isinstance(s, SingleMetric) or isinstance(s, MultiMetric):
                            schemas.append(s)
                        else:
                            schemas.extend(self._build_metrics([s]))
                else:
                    s = schema
                    schemas.extend(self._build_metrics([schema]))
            else:
                for s in module:
                    schemas.extend(self._build_metrics([s]))

        return schemas

    def build(self) -> WorkflowMetricConfig:
        schemas: List[Metric] = self._build_metrics(self._modules)

        return WorkflowMetricConfig(metrics=schemas)
