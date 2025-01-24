# pyright: reportUnknownArgumentType=none
# pyright: reportUnknownMemberType=none

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import pandas as pd

from whylabs_llm_toolkit.data.labels import Labels

from ..datasets_types import (
    BinaryClassificationDataset,
)
from ..evaluation_metrics import BinaryClassificationResult
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)

_INJECTIONS_MULTILINGUAL_URL = (
    "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/prompt_injections_multilingual.parquet"
)

INJECTION_SIZE_LIMITS = {
    Labels.injection: -1,
    Labels.innocuous: 5000,
    Labels.code: 500,
    Labels.medical: 500,
    Labels.financial: 500,
    Labels.toxic: 1000,
    Labels.hate: 1000,
    Labels.harmful: 0,  # injections data has harmful examples indirectly, so it's in a gray area
}


@dataclass
class InjectionsBenchmark(BinaryClassificationBenchmark):
    """
    Injections benchmark

    Datasets
    --------
    tensor_trust:
        Size: 5346 samples (1346 positives, 4000 negatives)
        Source: https://github.com/HumanCompatibleAI/tensor-trust-data (positive samples)
                https://huggingface.co/datasets/alespalla/chatbot_instruction_prompts (negative samples)
    intentions:
        Size: 226 samples (113 positives, 113 negatives)
        Source: AI-generated (gpt3.5, gpt4)

        This dataset is a collection of sentence pairs: a harmful version and a harmless version of the same prompt.
        The idea is that the pair of sentences should be as similar as possible, except for the harmful intent.
        The aim is to evaluate if the scorer is able to distinguish between the harmful and harmless versions of the prompts.
    jb_bench:
        Size: 2074 samples (1037 positives, 1037 negatives)
        Source:
            positive samples: https://github.com/JailbreakBench/jailbreakbench
            negative samples: https://huggingface.co/datasets/pavlichenko/WizardLM_evol_instruct_70k_train_val_split (eval split)
    multilingual:
        Size: 2034 samples (1034 positive, 1000 negative)
        Source:
            positive samples: 'https://huggingface.co/datasets/yanismiraoui/prompt_injections'
            negative samples: https://www.kaggle.com/datasets/luisdiegofv97/imdb-dataset-of-50k-movie-reviews-spanish
    jasperls:
        Size: 116 (60 positive, 56 negative) test split
        Source: https://huggingface.co/datasets/JasperLS/prompt-injections
    ivanleomk:
        Size: 917 (518 positive, 399 negative)
        Source: https://huggingface.co/datasets/ivanleomk/prompt_injection_password
    hackaprompt:
        Size: 34641 (all positive)
        Source: https://huggingface.co/datasets/hackaprompt/hackaprompt-dataset

        The dataset was filtered to get from dataset=submission_data and correct=True
    jailbreak_llms:
        Size: 666 (all positive)
        Source: https://github.com/verazuo/jailbreak_llms/tree/main/data/prompts (jailbreak_prompts_2023_05_07.csv)


    """

    description: str = "Injections benchmark"

    def weighted_average_score(self, results: Dict[str, BinaryClassificationResult]):
        """
        (dataset_name, metric, quality)
        quality is a subjective measure of the dataset quality. Factors that can be considered are:
        - Dataset size
        - Were the samples manually curated?
        - How diverse are the samples?
        - Are there known mislabeled samples, or dubious interpretations?
        - Others.

        Some datasets only have positive samples. In those cases, recall is the relevant metric.
        Since we favor precision over recall, we additionally weight the results by whether the metric is F0.5 or recall.
        """
        accepted_datasets = [
            ("tensor_trust", "f05", 2),
            ("intentions", "f05", 3),
            ("jb_bench", "f05", 4),
            ("ivanleomk", "f05", 1),
            ("hackaprompt", "recall", 2),
            ("jailbreak_llms", "recall", 2),
        ]
        MAX_QUALITY = 4
        scores: List[Tuple[float, float, float]] = []
        times: List[float] = []
        for dataset_name, metric, quality in accepted_datasets:
            if dataset_name in results:
                time = results[dataset_name].time
                if metric == "f05":
                    score = results[dataset_name].f05
                    metric_weight = 2 / 3
                    quality_weight = quality / MAX_QUALITY
                elif metric == "recall":
                    score = results[dataset_name].recall
                    metric_weight = 1 / 3
                    quality_weight = quality / MAX_QUALITY
                else:
                    raise ValueError(f"Metric {metric} not supported")
                if score is not None and time is not None:
                    scores.append((score, metric_weight, quality_weight))
                    times.append(time)
            else:
                raise ValueError(f"Dataset {dataset_name} not found in results")
        denominator = sum([metric_weight * quality_weight for _, metric_weight, quality_weight in scores])
        weighted_score = sum([score * metric_weight * quality_weight for score, metric_weight, quality_weight in scores])
        sum_time = sum(times)
        return (weighted_score / denominator, sum_time)

    def load_datasets(self, n: Optional[int] = None) -> List[BinaryClassificationDataset]:
        dataset_list: List[BinaryClassificationDataset] = []
        tensor_trust_df = pd.read_parquet(
            "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/injection_tensor_trust.parquet"
        )
        tensor_trust_ds = BinaryClassificationDataset(
            name="tensor_trust",
            inputs=tensor_trust_df["text"].tolist(),
            labels=tensor_trust_df["label"].tolist(),
        )
        dataset_list.append(tensor_trust_ds)

        multilingual_df = pd.read_parquet(_INJECTIONS_MULTILINGUAL_URL)
        multilingual_ds = BinaryClassificationDataset(
            name="injections_multilingual",
            inputs=multilingual_df["text"].tolist(),
            labels=multilingual_df["label"].tolist(),
        )
        dataset_list.append(multilingual_ds)
        intentions_df: pd.DataFrame = pd.read_csv(
            "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/intentions_ds.csv"
        )
        intentions_df = intentions_df[intentions_df["split"] == "train"]
        inputs: Sequence[str] = []
        labels: Sequence[int] = []
        inputs.extend(intentions_df["harmful"].tolist())
        labels.extend([1] * len(intentions_df["harmful"].tolist()))
        inputs.extend(intentions_df["harmless"].tolist())
        labels.extend([0] * len(intentions_df["harmless"].tolist()))
        intentions_ds = BinaryClassificationDataset(
            name="intentions",
            inputs=inputs,
            labels=labels,
        )
        dataset_list.append(intentions_ds)
        df = pd.read_parquet("https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/jailbreakbench.parquet")
        ds = BinaryClassificationDataset(
            name="jb_bench",
            inputs=df["prompts"].tolist(),
            labels=df["labels"].tolist(),
        )
        dataset_list.append(ds)
        jasper_df = pd.read_parquet(
            "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/jasperls_prompt_injections.parquet"
        )
        jasper_ds = BinaryClassificationDataset(
            name="jasperls",
            inputs=jasper_df["text"].tolist(),
            labels=jasper_df["label"].tolist(),
        )
        dataset_list.append(jasper_ds)
        ivanleomk_df = pd.read_parquet(
            "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/ivanleomk_prompt_injection_password.parquet"
        )
        ivanleomk_ds = BinaryClassificationDataset(
            name="ivanleomk",
            inputs=ivanleomk_df["text"].tolist(),
            labels=ivanleomk_df["label"].tolist(),
        )
        dataset_list.append(ivanleomk_ds)
        if not self.auto_threshold:  # this dataset only has positive samples - if autothreshold is enabled, we'll get perfect scores
            hackaprompt_df = pd.read_parquet(
                "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/hackaprompt_submission_data.parquet"
            )
            if n is not None:
                hackaprompt_df = hackaprompt_df.sample(n, random_state=42)
            else:
                hackaprompt_df = hackaprompt_df.sample(n=2000, random_state=42)
            hackaprompt_ds = BinaryClassificationDataset(
                name="hackaprompt",
                inputs=hackaprompt_df["text"].tolist(),
                labels=hackaprompt_df["label"].tolist(),
            )
            dataset_list.append(hackaprompt_ds)

            jailbreak_llms_df = pd.read_csv(
                "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/injections/jailbreak_llms_jailbreak_prompts_2023_05_07.csv"
            )
            jailbreak_llms_ds = BinaryClassificationDataset(
                name="jailbreak_llms",
                inputs=jailbreak_llms_df["text"].tolist(),
                labels=jailbreak_llms_df["label"].tolist(),
            )
            dataset_list.append(jailbreak_llms_ds)

        else:
            logger.info("Auto threshold is not supported for hackaprompt dataset. Ignoring hackaprompt dataset.")
        return dataset_list
