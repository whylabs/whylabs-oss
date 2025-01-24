import os
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings

from whylabs_llm_toolkit.data.scripts.targets import AssetStage, SentenceTransformerEncoder


class Settings(BaseSettings):
    fail: bool = True

    @field_validator("fail", check_fields=False)
    @classmethod
    def _fail_settings(cls, fail: bool) -> bool:
        if fail:
            raise ValueError("Don't create a Settings class. use get_settings() instead.")
        return fail

    XDG_CACHE_HOME: str = "~/.cache"
    WHYLABS_LLM_TOOLKIT_CACHE: str = os.path.join(XDG_CACHE_HOME, "whylabs_llm_toolkit")
    WHYLABS_API_ENDPOINT: str = "https://api.whylabsapp.com"
    WHYLABS_LLM_TOOLKIT_FORCE_DOWNLOAD: str = "false"
    WHYLABS_API_KEY: str = ""
    DEFAULT_ENCODER: str = SentenceTransformerEncoder.AllMiniLML6V2.name
    DEFAULT_ASSET_STAGE: AssetStage = "prod"
    USE_EXPERIMENTAL_MODELS: bool = False
    USE_SIGNAL_COEFFICIENT: bool = False
    VERBOSE_METRIC_NAMES: bool = False
    UNSHARED_FALLBACK: bool = False
    """
    This controls whether or not asset downloads will fall back to org specific assets if the asset is not found in the
    WhyLabs shared asset space.
    """
    # Used for training ci
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None

    # Used for OpenAI
    OPENAI_API_KEY: Optional[str] = None
    LANGKIT_OPENAI_LLM_MODEL_NAME: str = "gpt-4o-mini"
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_KEY: Optional[str] = None
    AZURE_DEPLOYMENT: Optional[str] = None

    @field_validator("WHYLABS_LLM_TOOLKIT_CACHE")
    @classmethod
    def expand_tilde(cls, v: str) -> str:
        return os.path.expanduser(v)


_settings: Optional[Settings] = None


def get_settings():
    global _settings
    if not _settings:
        _settings = Settings(fail=False)
    return _settings


def reload_settings():
    global _settings
    _settings = None
    return get_settings()
