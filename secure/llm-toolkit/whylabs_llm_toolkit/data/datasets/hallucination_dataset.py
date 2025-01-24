import logging
from functools import cache
from typing import List, Literal

import pandas as pd

from whylabs_llm_toolkit.data.data import Data
from whylabs_llm_toolkit.data.datasets.paths import raw_data_path

_logger = logging.getLogger(__name__)

_raw_data_path = f"{raw_data_path()}/hallucination"


class HallucinationDataset(Data):
    _required_columns: List[str] = [
        "gpt3_text",
        "wiki_bio_text",
        "gpt3_sentences",
        "annotation",
        "wiki_bio_test_idx",
        "gpt3_text_samples",
        "hallucination_type",
        "gt",
    ]

    def _write_data(self, train: pd.DataFrame, test: pd.DataFrame, eval: pd.DataFrame):
        pass

    def load(self) -> None:
        pass

    def _create_data_subdir(self) -> None:
        pass

    def get_data_subdir(self) -> str:
        raise NotImplementedError

    def get_file_prefix(self) -> str:
        raise NotImplementedError

    def _validate_data(self, data: pd.DataFrame) -> None:
        # Ensure that the dataframe has the correct columns: dataset, text, source
        for column in self._required_columns:
            assert column in data.columns, f"Missing column: {column}"

    @cache
    def _get_eval_data(self) -> pd.DataFrame:
        return pd.read_json(f"{_raw_data_path}/sampled_wiki_bio.json")  # pyright: ignore[reportUnknownMemberType]

    def get_data(self, data_type: Literal["train", "test", "eval"], strict_columns=True) -> pd.DataFrame:
        if data_type == "train":
            raise NotImplementedError
        elif data_type == "test":
            raise NotImplementedError
        elif data_type == "eval":
            data = self._get_eval_data()
        else:
            raise ValueError(f"Invalid data_type: {data_type}")

        self._validate_data(data)
        if strict_columns:
            data = data[self._required_columns]

        return data


class HallucinationNemoResultsDataset(Data):
    _required_columns = ["question", "hallucination_agreement", "truth", "bot_response", "extra_responses", "latency"]

    def _write_data(self, train: pd.DataFrame, test: pd.DataFrame, eval: pd.DataFrame):
        pass

    def load(self) -> None:
        pass

    def _create_data_subdir(self) -> None:
        pass

    def get_data_subdir(self) -> str:
        raise NotImplementedError

    def get_file_prefix(self) -> str:
        raise NotImplementedError

    def _validate_data(self, data: pd.DataFrame) -> None:
        # Ensure that the dataframe has the correct columns: dataset, text, source
        for column in self._required_columns:
            assert column in data.columns, f"Missing column: {column}"

    @cache
    def _get_eval_data(self) -> pd.DataFrame:
        return pd.read_json(f"{_raw_data_path}/small_predictions.json")  # pyright: ignore[reportUnknownMemberType]

    def get_data(self, data_type: Literal["train", "test", "eval"], strict_columns=True) -> pd.DataFrame:
        if data_type == "train":
            raise NotImplementedError
        elif data_type == "test":
            raise NotImplementedError
        elif data_type == "eval":
            data = self._get_eval_data()
        else:
            raise ValueError(f"Invalid data_type: {data_type}")

        self._validate_data(data)
        if strict_columns:
            data = data[self._required_columns]

        return data
