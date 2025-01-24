from dataclasses import dataclass

from langkit.core.context import VerboseName


@dataclass
class Foo(VerboseName):
    a: int
    b: str
    _c: float

    def get_verbose_title(self) -> str:
        return "Foo"


def test_verbose_name():
    foo = Foo(a=1, b="2", _c=3.0)
    assert foo.get_verbose_name() == "Foo?a=1&b=2"
