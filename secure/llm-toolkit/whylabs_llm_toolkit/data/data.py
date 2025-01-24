# pyright: reportUnknownMemberType=false, reportCallIssue=false
import ast
import logging
import os
from abc import ABC, abstractmethod
from functools import cache
from typing import Any, Dict, Literal, Optional

import pandas as pd

from whylabs_llm_toolkit.data import init_ci_logging
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts import GLOBAL_SEED
from whylabs_llm_toolkit.data.scripts.exclusion_list import ExclusionList

logger = logging.getLogger(__name__)

required_columns = ["dataset", "text", "source", "label", "uid"]

SizeFilter = Dict[Labels, int]


def create_size_filter(size: Optional[int] = None, label_sizes: Optional[Dict[Labels, int]] = None) -> SizeFilter:
    if size is None:
        return {}

    filter: SizeFilter = {label: size for label in Labels}

    if label_sizes:
        for label, label_size in label_sizes.items():
            filter[label] = label_size

    return filter


class Data(ABC):
    def __init__(self, size_filter: Optional[SizeFilter] = None) -> None:
        init_ci_logging()
        self._create_data_subdir()
        self._logger = logging.getLogger(self.__class__.__name__)
        self._size_filter = size_filter or {}

    def _write_data(self, train: pd.DataFrame, test: pd.DataFrame, eval: pd.DataFrame):
        self._write_train_csv(train)
        self._write_test_csv(test)
        self._write_eval_csv(eval)

    def _filter_size(self, df: pd.DataFrame) -> pd.DataFrame:
        full_dataset = df.copy()
        df = df.drop_duplicates(subset=["text"], keep="first")

        # filter amount by the dataset column. The self.size_filter dict
        # has the number of each category to retain
        for label, size in self._size_filter.items():
            if size != -1:
                df = df[df["dataset"] != label.name]
                filtered_dataset = full_dataset[full_dataset["dataset"] == label.name]
                if len(filtered_dataset) > size:
                    subset = filtered_dataset.sample(n=size, random_state=GLOBAL_SEED)
                else:
                    subset = filtered_dataset
                df = pd.concat([df, subset])

        return df

    @abstractmethod
    def load(self) -> None:
        raise NotImplementedError

    @cache
    def _get_test_data(self) -> pd.DataFrame:
        df = pd.read_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_test.csv")
        return self._filter_size(df)

    @cache
    def _get_train_data(self) -> pd.DataFrame:
        df = pd.read_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_train.csv")
        return self._filter_size(df)

    @cache
    def _get_eval_data(self) -> pd.DataFrame:
        df = pd.read_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_eval.csv")
        return self._filter_size(df)

    def _write_train_csv(self, df: pd.DataFrame):
        df.to_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_train.csv", index=False)

    def _write_test_csv(self, df: pd.DataFrame):
        df.to_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_test.csv", index=False)

    def _write_eval_csv(self, df: pd.DataFrame):
        df.to_csv(f"{self.get_data_subdir()}/{self.get_file_prefix()}_eval.csv", index=False)

    def _create_data_subdir(self) -> None:
        if not os.path.exists(self.get_data_subdir()):
            os.makedirs(self.get_data_subdir())

    @abstractmethod
    def get_data_subdir(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def get_file_prefix(self) -> str:
        raise NotImplementedError

    def _validate_data(self, data: pd.DataFrame) -> None:
        # Ensure that the dataframe has the correct columns: dataset, text, source
        for column in required_columns:
            assert column in data.columns, f"Missing column: {column}"

    def required_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        return df[required_columns]

    def get_data(self, data_type: Literal["train", "test", "eval"], strict_columns=True) -> pd.DataFrame:
        if data_type == "train":
            data = self._get_train_data()
            data = ExclusionList().remove_using_exclusion_list(data)
        elif data_type == "test":
            data = self._get_test_data()
            data = ExclusionList().remove_using_exclusion_list(data)
        elif data_type == "eval":
            data = self._get_eval_data()
            data = ExclusionList().remove_using_exclusion_list(data)
        else:
            raise ValueError(f"Invalid data_type: {data_type}")

        self._validate_data(data)

        def fix_labels(val: Any):
            if isinstance(val, str):
                return ast.literal_eval(val)
            return val

        if strict_columns:
            data = self.required_columns(data)
        data["label"] = data["label"].apply(fix_labels)
        return data

    def __str__(self):
        current_class_name = self.__class__.__name__
        return f"""#{current_class_name}
## Train:
### len: {len(self._get_train_data())}
{self.get_data("train").sample(min(10, len(self.get_data("train"))))}

### summary
{self.get_data("train").groupby('dataset').size().reset_index(name='counts')}

## Test:
### len: {len(self._get_test_data())}
{self.get_data("test").sample(min(10, len(self.get_data("test"))))}

### summary:
{self.get_data("test").groupby('dataset').size().reset_index(name='counts')}

## Eval:
### len: {len(self._get_eval_data())}
{self.get_data("eval").sample(min(10, len(self.get_data("eval"))))}

### summary:
{self.get_data("eval").groupby('dataset').size().reset_index(name='counts')}

"""


class DataGroup(Data):
    def __init__(self, datasets: list[Data], size_filter: Optional[SizeFilter] = None):
        # TODO integrate the deduping logic across datasets
        self.datasets = datasets
        # super().__init__()
        self._size_filter = size_filter or {}

    @cache
    def _get_train_data(self) -> pd.DataFrame:
        df = pd.concat([dataset._get_train_data() for dataset in self.datasets])
        return self._filter_size(df)

    @cache
    def _get_test_data(self) -> pd.DataFrame:
        df = pd.concat([dataset._get_test_data() for dataset in self.datasets])
        return self._filter_size(df)

    @cache
    def _get_eval_data(self) -> pd.DataFrame:
        df = pd.concat([dataset._get_eval_data() for dataset in self.datasets])
        return self._filter_size(df)

    def get_data_subdir(self) -> str:
        raise NotImplementedError("This doesn't matter for DataGroup")

    def get_file_prefix(self) -> str:
        raise NotImplementedError("This doesn't matter for DataGroup")

    def load(self) -> None:
        for dataset in self.datasets:
            logging.info(f"Downloading dataset {type(dataset)}")
            dataset.load()
            logging.info(dataset)


def download_data(data: Data) -> None:
    data.load()
