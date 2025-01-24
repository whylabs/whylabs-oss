# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import Dict, Optional, cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from whylabs_llm_toolkit.data.data import Data, DataGroup, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process, process_oai_moderation_data
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts import GLOBAL_SEED

_ds_name = "LennardZuendorf/Dynamically-Generated-Hate-Speech-Dataset"
_file_name = _ds_name.replace("/", "_")

_data_path = f"{data_path()}/hate"
_raw_data_path = f"{raw_data_path()}/hate"


class DGHSHateDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_ds_name, revision="18901c8e937d3f88674efdf398375dc2b919baac"))

        # has 82k rows
        # 35544 with split==train
        # 4539 with split==test
        train = cast(pd.DataFrame, data["train"].to_pandas())
        test_full = train[train["split"] == "test"]
        train = train[train["split"] == "train"]

        train = common_process(train, label=Labels.hate, source=_ds_name, filter_by={"label": "hate"})
        test = common_process(test_full[: len(test_full) // 2], label=Labels.hate, source=_ds_name, filter_by={"label": "hate"})
        eval = common_process(test_full[len(test_full) // 2 :], label=Labels.hate, source=_ds_name, filter_by={"label": "hate"})

        train = train[0:1000]
        test = test[0:1000]
        eval = eval[0:1000]

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/"

    def get_file_prefix(self) -> str:
        return _file_name


_oai_ds_name = "mmathys/openai-moderation-api-evaluation"
_oai_ds_file_name = _oai_ds_name.replace("/", "_")


class OAIModerationHateDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_oai_ds_name, revision="84e5cf3bcd6acb3dfc70b6760451645872218a3e"))
        complete: pd.DataFrame = cast(pd.DataFrame, data["train"].to_pandas())
        complete = process_oai_moderation_data(complete)
        complete = complete.sample(frac=1, random_state=GLOBAL_SEED).reset_index(drop=True)
        complete = complete[complete["category"] == "hate"]
        train = complete[0 : len(complete) // 2]
        test = complete[len(complete) // 2 : 3 * len(complete) // 4]
        eval = complete[3 * len(complete) // 4 :]

        train = common_process(train, label=Labels.hate, source=_oai_ds_name, filter_by={"category": "hate"}, rename={"prompt": "text"})
        test = common_process(test, label=Labels.hate, source=_oai_ds_name, filter_by={"category": "hate"}, rename={"prompt": "text"})
        eval = common_process(eval, label=Labels.hate, source=_oai_ds_name, filter_by={"category": "hate"}, rename={"prompt": "text"})
        self._write_data(train=train, test=test, eval=test)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_oai_ds_file_name}"

    def get_file_prefix(self) -> str:
        return _oai_ds_file_name


_jigsaw_ds_name = "jigsaw"


class JigsawHateCommentsDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{_raw_data_path}/{_jigsaw_ds_name}"
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_eval.csv")
        train = common_process(train, label=Labels.hate, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        test = common_process(test, label=Labels.hate, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        eval = common_process(eval, label=Labels.hate, source=_jigsaw_ds_name, rename={"comment_text": "text"})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_jigsaw_ds_name}"

    def get_file_prefix(self) -> str:
        return _jigsaw_ds_name


class HateDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                DGHSHateDataset(),
                OAIModerationHateDataset(),
                JigsawHateCommentsDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    download_data(HateDataset())
    data = HateDataset().get_data("train")
