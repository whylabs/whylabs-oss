from dataclasses import dataclass
from typing import Any, List, Optional, Sequence


@dataclass
class BinaryClassificationDataset:
    name: str
    inputs: List[str]
    labels: Sequence[int]


@dataclass
class MultiInputBinaryClassificationDataset:
    name: str
    inputs: List[str]
    labels: Sequence[int]
    context: Optional[Sequence[Any]]
