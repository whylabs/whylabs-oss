from abc import ABC, abstractmethod
from typing import Iterable, Literal, TypedDict, Union

from typing_extensions import Unpack

from openai.types.chat import ChatCompletion, ChatCompletionMessageParam
from whylabs_llm_toolkit.settings import get_settings

_llm_model_temperature = 0.9
_llm_model_max_tokens = 1024
_llm_model_frequency_penalty = 0
_llm_model_presence_penalty = 0.6


class LLMInvocationParams(TypedDict, total=False):
    model: str
    temperature: float
    max_tokens: int
    frequency_penalty: float
    presence_penalty: float


class LLMInvoker(ABC):
    def __init__(self, **params: Unpack[LLMInvocationParams]):
        self._params: LLMInvocationParams = {
            "model": params.get("model", get_settings().LANGKIT_OPENAI_LLM_MODEL_NAME),
            "temperature": params.get("temperature", _llm_model_temperature),
            "max_tokens": params.get("max_tokens", _llm_model_max_tokens),
            "frequency_penalty": params.get("frequency_penalty", _llm_model_frequency_penalty),
            "presence_penalty": params.get("presence_penalty", _llm_model_presence_penalty),
        }

    def _param_overrides(self, params: LLMInvocationParams) -> LLMInvocationParams:
        overrides: LLMInvocationParams = {
            **self._params,
            **params,
        }
        return overrides

    @abstractmethod
    def completion(self, messages: Iterable[ChatCompletionMessageParam], **params: Unpack[LLMInvocationParams]) -> ChatCompletion:
        ...


OpenAIChoiceArg = Union[Literal["default"], Literal["azure"], Literal["openai"]]
