# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from whylabs_llm_toolkit.data.data import Data, DataGroup, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels

_intentions_ds_name = "intentions"
_harmful_behavior_name = "mlabonne/harmful_behaviors"
_harmful_behavior_file_name = _harmful_behavior_name.replace("/", "_")

_data_path = f"{data_path()}/harmful"
_raw_data_path = f"{raw_data_path()}/harmful"


class HarmfulIntentionsDataset(Data):
    """
    intentions:
        Size: 226 samples (113 positives, 113 negatives)
        Source: AI-generated (gpt3.5, gpt4)

        This dataset is a collection of sentence pairs: a harmful version and a harmless version of the same prompt.
        The idea is that the pair of sentences should be as similar as possible, except for the harmful intent.
        The aim is to evaluate if the scorer is able to distinguish between the harmful and harmless versions of the prompts."""

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_intentions_ds_name}.csv")
        test = test.drop(columns=["harmless"])
        test["label"] = 1
        test = common_process(test, label=Labels.harmful, source=_intentions_ds_name, filter_by={"label": 1}, rename={"harmful": "text"})
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/"

    def get_file_prefix(self) -> str:
        return _intentions_ds_name


class HarmfulBehaviorDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_harmful_behavior_name, revision="01cead01398926d81f7c52bdb790ee8cf77ebba7"))

        train = cast(pd.DataFrame, data["train"].to_pandas())
        train["label"] = 1
        train, eval = train.iloc[: int(len(train) * 0.8)], train.iloc[int(len(train) * 0.8) :]
        test = cast(pd.DataFrame, data["test"].to_pandas())
        test["label"] = 1
        train = common_process(train, label=Labels.harmful, source=_harmful_behavior_file_name, filter_by={"label": 1})
        eval = common_process(eval, label=Labels.harmful, source=_harmful_behavior_file_name, filter_by={"label": 1})
        test = common_process(test, label=Labels.harmful, source=_harmful_behavior_file_name, filter_by={"label": 1})
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_harmful_behavior_file_name}/"

    def get_file_prefix(self) -> str:
        return _harmful_behavior_file_name


class HarmfulDataset(DataGroup):
    def __init__(self):
        super().__init__(
            [
                HarmfulIntentionsDataset(),
                HarmfulBehaviorDataset(),
            ]
        )


if __name__ == "__main__":
    download_data(HarmfulDataset())
    data = HarmfulDataset().get_data("train")
