from typing import Any, Generic, Iterator, TypeVar
from typing import Generator as PyGenerator

T = TypeVar("T")  # Type of yielded values
R = TypeVar("R")  # Type of return value


class GeneratorValue(Generic[T, R]):
    def __init__(self, gen: PyGenerator[T, Any, R]):
        self.gen = gen
        self.value: R

    def __iter__(self) -> Iterator[T]:
        self.value = yield from self.gen
        return self.value
