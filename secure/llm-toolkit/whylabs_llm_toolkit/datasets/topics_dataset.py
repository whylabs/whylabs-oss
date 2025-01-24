from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder

from .base import Dataset


class MedicalDataset(Dataset):
    def __init__(
        self, tag: str, encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, version: Optional[int] = None
    ):
        super().__init__("medical", tag=tag, version=version, encoder_name=encoder_name)


class CodeDataset(Dataset):
    def __init__(
        self, tag: str, encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, version: Optional[int] = None
    ):
        super().__init__("code", tag=tag, version=version, encoder_name=encoder_name)


class FinancialDataset(Dataset):
    def __init__(
        self, tag: str, encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, version: Optional[int] = None
    ):
        super().__init__("financial", tag=tag, version=version, encoder_name=encoder_name)
