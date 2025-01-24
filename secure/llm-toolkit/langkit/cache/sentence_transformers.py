from functools import cache

from sentence_transformers import SentenceTransformer

from langkit.tensor_util import device


@cache
def load_sentence_transformer(name: str, revision: str) -> SentenceTransformer:
    return SentenceTransformer(name, revision=revision, device=device)
