import logging
from typing import Optional

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder

from .base import Scorer
from .base_chroma import ChromaScorer
from .code_scorer import CodeScorer, CodeScorerChroma
from .financial_scorer import FinancialScorer, FinancialScorerChroma
from .injection_scorer import InjectionScorer, InjectionScorerChroma
from .medical_scorer import MedicalScorer, MedicalScorerChroma
from .refusal_scorer import RefusalsScorer, RefusalsScorerChroma

scorer_maps = {
    "injections": InjectionScorer,
    "refusals": RefusalsScorer,
    "medical": MedicalScorer,
    "code": CodeScorer,
    "financial": FinancialScorer,
}

chroma_scorer_maps = {
    "injections": InjectionScorerChroma,
    "refusals": RefusalsScorerChroma,
    "medical": MedicalScorerChroma,
    "code": CodeScorerChroma,
    "financial": FinancialScorerChroma,
}

logger = logging.getLogger(__name__)


def get_scorer(dataset: str, tag: str, encoder_name: SentenceTransformerEncoder, version: Optional[int] = None) -> Scorer:
    scorer = scorer_maps.get(dataset, None)
    if scorer is None:
        logger.warning(f"Scorer for Dataset {dataset} not found. Using base Scorer")
        return Scorer(dataset=dataset, tag=tag, version=version, encoder_name=encoder_name)
    return scorer(tag=tag, encoder_name=encoder_name)


def get_scorer_chroma(
    dataset: str,
    tag: str,
    version: Optional[int] = None,
    encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2,
) -> ChromaScorer:
    if tag == "":
        return ChromaScorer(dataset=dataset, tag=tag, version=version, encoder_name=encoder_name)
    scorer = chroma_scorer_maps.get(dataset, None)
    if scorer is None:
        logger.warning(f"Chroma scorer for Dataset {dataset} not found. Using base Scorer")
        return ChromaScorer(dataset=dataset, tag=tag, version=version, encoder_name=encoder_name)
    return scorer(tag=tag, encoder_name=encoder_name)


__ALL__ = [
    InjectionScorer,
    RefusalsScorer,
    MedicalScorer,
    CodeScorer,
    FinancialScorer,
    InjectionScorerChroma,
    MedicalScorerChroma,
    FinancialScorerChroma,
    CodeScorerChroma,
    RefusalsScorerChroma,
]
