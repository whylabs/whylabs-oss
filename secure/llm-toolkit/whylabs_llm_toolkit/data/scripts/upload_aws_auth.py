# pyright: reportGeneralTypeIssues=false, reportUnknownVariableType=false, reportUnknownMemberType=false
# pyright: reportUnknownArgumentType=false, reportUnusedVariable=false
import json

from whylabs_llm_toolkit.settings import get_settings


def get_aws_auth_value() -> str:
    settings = get_settings()

    # If we already have the key, secret, and session token in the env then just use them
    # This probably only happens during manual testing.
    if not settings.AWS_ACCESS_KEY_ID:
        raise ValueError("AWS_ACCESS_KEY_ID not set")

    if not settings.AWS_SECRET_ACCESS_KEY:
        raise ValueError("AWS_SECRET_ACCESS_KEY not set")

    if not settings.AWS_SESSION_TOKEN:
        raise ValueError("AWS_SESSION_TOKEN not set")

    return json.dumps(
        {
            "AccessKeyId": settings.AWS_ACCESS_KEY_ID,
            "SecretAccessKey": settings.AWS_SECRET_ACCESS_KEY,
            "SessionToken": settings.AWS_SESSION_TOKEN,
        }
    )
