from abc import abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Generic, List, TypeVar
from urllib.parse import quote_plus, urlencode

import pandas as pd


@dataclass
class Context:
    request_data: Dict[str, Any] = field(default_factory=dict)


RequestData = TypeVar("RequestData")


class VerboseName:
    @staticmethod
    def _is_public_non_callable(attr: str, value: Any) -> bool:
        return not attr.startswith("_") and not isinstance(value, Callable)

    def get_verbose_options(self) -> Dict[str, str]:
        params = {k: v for k, v in vars(self).items() if VerboseName._is_public_non_callable(k, v)}
        return params

    def get_verbose_title(self) -> str:
        return ""

    def get_verbose_name(self) -> str:
        """
        Get the full verbose name of the form "title?param1=value1&param2=value2"
        """
        query = urlencode(self.get_verbose_options(), quote_via=quote_plus)
        return f"{self.get_verbose_title()}?{query}"


class ContextDependency(Generic[RequestData], VerboseName):
    def name(self) -> str:
        return self.get_verbose_name()

    @abstractmethod
    def cache_assets(self) -> None:
        raise NotImplementedError()

    @abstractmethod
    def init(self) -> None:
        raise NotImplementedError()

    @abstractmethod
    def populate_request(self, context: Context, data: pd.DataFrame) -> None:
        raise NotImplementedError()

    @abstractmethod
    def get_request_data(self, context: Context) -> RequestData:
        return context.request_data[self.name()]

    @abstractmethod
    def get_dependencies(self) -> List["ContextDependency[Any]"]:
        return []
