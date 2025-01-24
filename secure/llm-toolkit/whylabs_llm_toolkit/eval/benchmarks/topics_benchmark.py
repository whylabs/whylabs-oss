# pyright: reportUnknownArgumentType=none
# pyright: reportUnknownVariableType=none
# pyright: reportUnknownMemberType=none
# pyright: reportAttributeAccessIssue=none

import logging
import random
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import pandas as pd
from sklearn.datasets import fetch_20newsgroups

from ..datasets_types import (
    BinaryClassificationDataset,
)
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)
topics_mapping = {
    "medical": {"topics_ds": ["medicine"], "20ng": ["sci.med"]},
    "code": {"topics_ds": ["code"]},
    "finance": {"topics_ds": ["finance"]},
}


def load_topics_ds(topic: str, n: Optional[int] = None) -> Optional[BinaryClassificationDataset]:
    if topic not in topics_mapping:
        logger.warning(f"Topic {topic} not found in topics_mapping")
        return None
    df = pd.read_parquet("https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/topics/topics_ds_v2.parquet")
    df = df[df["split"] == "test"]
    if n is not None:
        if n > len(df):
            logger.warning("n is larger than the dataset size. Returning complete dataset.")
        else:
            df = df.sample(n, random_state=42)
    df = df.dropna(subset=["text", "topic"])
    if topic == "finance":
        df = df[df["topic"] != "politics"]  # politics topic has a lot of overlap with finance
    input_list: Sequence[str] = df["text"].tolist()
    topic_list: Sequence[str] = df["topic"].tolist()
    label_list = [1 if topic_row in topics_mapping[topic]["topics_ds"] else 0 for topic_row in topic_list]

    ds = BinaryClassificationDataset(
        name="topics_ds",
        inputs=input_list,
        labels=label_list,
    )
    return ds


def _shuffle_and_sample(input_list: List[str], label_list: Sequence[int], n: int) -> Tuple[List[str], Sequence[int]]:
    random.seed(42)
    if len(input_list) != len(label_list):
        raise ValueError("Both lists must have the same length.")
    if n > len(input_list):
        logger.warning("n is larger than the dataset size. Returning complete dataset.")
        return input_list, label_list

    indices = list(range(len(input_list)))
    random.shuffle(indices)

    sampled_indices = indices[:n]

    sampled_list1 = [input_list[i] for i in sampled_indices]
    sampled_list2 = [label_list[i] for i in sampled_indices]

    return sampled_list1, sampled_list2


def load_ng_ds(topic: str, n: Optional[int] = None) -> Optional[BinaryClassificationDataset]:
    if topic not in topics_mapping:
        logger.warning(f"Topic {topic} not found in topics_mapping")
        return None
    if topics_mapping[topic].get("20ng") is None:
        logger.warning(f"Topic {topic} not found in topics_mapping for 20 Newsgroups")
        return None
    newsgroups_test = fetch_20newsgroups(
        subset="test",
        remove=("headers", "footers", "quotes"),
    )
    categories = list(newsgroups_test.target_names)
    accepted_categories = topics_mapping[topic]["20ng"]
    input_list, label_list = [], []
    for target, data in zip(newsgroups_test.target, newsgroups_test.data):
        if len(data) > 0:
            input_list.append(data)
            if categories[target] in accepted_categories:
                label_list.append(1)
            else:
                label_list.append(0)
    if n is not None:
        input_list, label_list = _shuffle_and_sample(input_list, label_list, n)
    ng_ds = BinaryClassificationDataset(
        name="20_newsgroups",
        inputs=input_list,
        labels=label_list,
    )
    return ng_ds


def _resolve_datasets(topic: str, n: Optional[int] = None) -> List[BinaryClassificationDataset]:
    ds_lists = []
    ds_lists.append(load_topics_ds(topic, n=n))
    ds_lists.append(load_ng_ds(topic, n=n))
    ds_lists = [ds for ds in ds_lists if ds is not None]
    return ds_lists


@dataclass
class TopicsBenchmark(BinaryClassificationBenchmark):
    """
    Topics Benchmark

    Datasets
    --------
    topics ds:
        Size: ~32000 samples (10k medical, 13k code, 10k politics)
        Splits: train (~16k), test (~16k)
        Source:
            Medicine: https://huggingface.co/datasets/medalpaca/medical_meadow_wikidoc
            Code: https://huggingface.co/datasets/codeparrot/github-code-clean
            Politics: https://www.kaggle.com/datasets/gpreda/politics-on-reddit
            Finance:
                bitext/Bitext-customer-support-llm-chatbot-training-dataset
                    (Categories "ORDER", "REFUND", "INVOICE", "PAYMENT", "SHIPPING", "CANCEL")
                https://huggingface.co/datasets/steve1989/financial_news_headlines


        The sizes are approximate because the datasets are preprocessed and cleaned: empty strings are removed and
        texts with less than 5*5 characters are removed and the texts are pruned to a max 1024*5 characters.
        The code topic was sampled to get 400 examples of each of 30 different programming languages.
    20 Newsgroups:
        Source: sklearn.datasets.fetch_20newsgroups
    """

    description: str = "Topics Benchmark"
    topic: str = "unspecified"

    def load_datasets(self, n: Optional[int] = None) -> List[BinaryClassificationDataset]:
        ds_lists = _resolve_datasets(self.topic, n)
        return ds_lists
