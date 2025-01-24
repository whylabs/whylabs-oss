# pyright: basic
# TODO remove this type disabling comment and fix the types

import logging

from typing_extensions import Unpack

from langkit.openai.hallucination_types import LLMInvocationParams, LLMInvoker, OpenAIChoiceArg
from openai import AzureOpenAI, OpenAI, api_version
from whylabs_llm_toolkit.settings import get_settings

_logger = logging.getLogger(__name__)


class OpenAIDefault(LLMInvoker):
    def completion(self, messages, **params):
        api_key = get_settings().OPENAI_API_KEY

        if not api_key:
            raise Exception("OPENAI_API_KEY env var is not set when trying to use OpenAI API")

        client = OpenAI(api_key=api_key)

        return client.chat.completions.create(messages=messages, **self._param_overrides(params))


class OpenAIAzure(LLMInvoker):
    def completion(self, messages, **params):
        endpoint = get_settings().AZURE_OPENAI_ENDPOINT
        api_key = get_settings().AZURE_OPENAI_KEY

        if not endpoint:
            raise Exception("AZURE_OPENAI_ENDPOINT env var is not set when trying to use Azure OpenAI API")

        if not api_key:
            raise Exception("AZURE_OPENAI_KEY env var is not set when trying to use Azure OpenAI API")

        client = AzureOpenAI(
            api_version=api_version,
            api_key=api_key,
            # The endpoint should be just the domain, not the full URL. The rest of the url is constructed based on
            # the model and api version args
            azure_endpoint=endpoint,
            azure_deployment=get_settings().AZURE_DEPLOYMENT,
        )

        return client.chat.completions.create(messages=messages, **self._param_overrides(params))


def get_llm(llm: OpenAIChoiceArg = "default", **params: Unpack[LLMInvocationParams]) -> LLMInvoker:
    if llm == "azure":
        _logger.debug(f"Using Azure OpenAI with model {params.get('model')}")
        return OpenAIAzure(**params)
    else:
        _logger.debug(f"Using OpenAI with model {params.get('model')}")
        return OpenAIDefault(**params)
