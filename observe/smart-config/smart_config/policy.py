from abc import ABC, abstractmethod


class RecommenderPolicy(ABC):
    name: str