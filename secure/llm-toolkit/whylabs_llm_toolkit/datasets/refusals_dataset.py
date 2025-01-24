from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder

from .base import Dataset


class RefusalsDataset(Dataset):
    def __init__(
        self, tag: str, encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, version: Optional[int] = None
    ):
        super().__init__("refusals", tag=tag, version=version, encoder_name=encoder_name)
