# pyright: reportUnknownMemberType=none
# pyright: reportUnknownVariableType=none
# pyright: reportUnknownLambdaType=none

from typing import Optional, Sequence

import numpy as np
import pytest
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from whylabs_llm_toolkit.eval.benchmarks import ConsistencyBenchmark
from whylabs_llm_toolkit.models.base import MultiInputScorer


class CustomSelfCheckNLI:
    """
    SelfCheckGPT (NLI variant): Checking LLM's text against its own sampled texts via DeBERTa-v3 finetuned to Multi-NLI
    """

    def __init__(self, nli_model: Optional[str] = None, device=None):  # type: ignore
        if not nli_model:
            raise ValueError("nli model not passed.")
        self.tokenizer = AutoTokenizer.from_pretrained(nli_model)
        self.model = AutoModelForSequenceClassification.from_pretrained(nli_model)
        self.model.eval()
        if device is None:
            device = torch.device("cpu")
        self.model.to(device)
        self.device = device
        print("SelfCheck-NLI initialized to device", device)  # type: ignore

    @torch.no_grad()  # pyright: ignore[reportUntypedFunctionDecorator]
    def predict(
        self,
        sentences: Sequence[str],
        sampled_passages: Sequence[Sequence[str]],
    ):
        """
        This function takes sentences (to be evaluated) with sampled passages (evidence), and return sent-level scores
        :param sentences: list[str] -- sentences to be evaluated, e.g. GPT text response spilt by spacy
        :param sampled_passages: list[str] -- stochastically generated responses (without sentence splitting)
        :return sent_scores: sentence-level score which is P(condict|sentence, sample)
        note that we normalize the probability on "entailment" or "contradiction" classes only
        and the score is the probability of the "contradiction" class
        """
        num_sentences = len(sentences)
        num_samples = len(sampled_passages)
        scores = np.zeros((num_sentences, num_samples))
        for sent_i, sentence in enumerate(sentences):
            for sample_i, sample in enumerate(sampled_passages[sent_i]):
                inputs = self.tokenizer.batch_encode_plus(
                    batch_text_or_text_pairs=[(sentence, sample)],
                    add_special_tokens=True,
                    padding="longest",
                    truncation=True,
                    return_tensors="pt",
                    return_token_type_ids=True,
                    return_attention_mask=True,
                )
                inputs = inputs.to(self.device)
                logits = self.model(**inputs).logits  # neutral is already removed
                probs = torch.softmax(logits, dim=-1)  # type: ignore
                prob_ = probs[0][1].item()  # prob(contradiction)
                scores[sent_i, sample_i] = prob_
        scores_per_sentence = scores.mean(axis=-1)
        return scores_per_sentence


device = "cpu"


class NLIScorer(MultiInputScorer):
    def __init__(self, n_samples=2):
        self.n_samples = n_samples
        self.model = CustomSelfCheckNLI(
            device=device,
            nli_model="MoritzLaurer/xtremedistil-l6-h256-zeroshot-v1.1-all-33",
        )

    def predict(self, inputs, context):
        predictions = self.model.predict(inputs, [samples[: self.n_samples] for samples in context])
        return predictions


consistency_benchmark = ConsistencyBenchmark(auto_threshold=True)


@pytest.mark.load
def test_consistency():
    results = consistency_benchmark.run(NLIScorer())
    assert "wiki_bio_gpt3" in results.get_group_names()
