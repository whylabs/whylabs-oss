from typing_extensions import NotRequired, TypedDict, Unpack

from langkit.core.workflow import Callback


class BasicValidationFailureOptions(TypedDict):
    url: str
    include_input: NotRequired[bool]


class StaticBearerAuthValidationFailureOptions(TypedDict):
    url: str
    auth_token: str
    auth_header: NotRequired[str]
    bearer_prefix: NotRequired[str]
    include_input: NotRequired[bool]


class SlackValidationFailureOptions(TypedDict):
    url: str


class lib:
    class webhook:
        @staticmethod
        def basic_validation_failure(**kwargs: Unpack[BasicValidationFailureOptions]) -> Callback:
            from langkit.callbacks.webhook import Webhook

            return Webhook(kwargs["url"], kwargs.get("include_input", False))

        @staticmethod
        def static_bearer_auth_validation_failure(**kwargs: Unpack[StaticBearerAuthValidationFailureOptions]) -> Callback:
            from langkit.callbacks.webhook import BearerAuthValidationWebhook

            return BearerAuthValidationWebhook(
                kwargs["url"],
                kwargs["auth_token"],
                kwargs.get("auth_header", "Authorization"),
                kwargs.get("bearer_prefix", "Bearer"),
                kwargs.get("include_input", False),
            )

        @staticmethod
        def slack_validation_failure(**kwargs: Unpack[SlackValidationFailureOptions]) -> Callback:
            from langkit.callbacks.webhook import SlackValidationWebhook

            return SlackValidationWebhook(kwargs["url"])
