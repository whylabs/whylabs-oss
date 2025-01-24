from typing import Optional

from typing_extensions import NotRequired, TypedDict, Unpack

from langkit.core.metric import WorkflowOptions, call_options_fn


def test_option_functon():
    def fn(options: WorkflowOptions) -> int:
        return options["a"]

    actual = call_options_fn(fn, {"a": 2})

    assert actual == 2


def test_no_option():
    def fn() -> int:
        return 5

    actual = call_options_fn(fn, {"a": 2})

    assert actual == 5


def test_kwargs_all_optional():
    class Args(TypedDict):
        a: NotRequired[int]

    def fn(**kwargs: Unpack[Args]) -> Optional[int]:
        return kwargs.get("a")

    actual = call_options_fn(fn, {"a": 2})

    assert actual is None
