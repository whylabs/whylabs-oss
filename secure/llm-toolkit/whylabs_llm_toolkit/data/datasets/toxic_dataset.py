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

_ds_name = "mteb/toxic_conversations_50k"
_file_name = _ds_name.replace("/", "_")
_data_path = f"{data_path()}/toxic"
_raw_data_path = f"{raw_data_path()}/toxic"


class MTEBToxicDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_ds_name, revision="edfaf9da55d3dd50d43143d90c1ac476895ae6de"))

        # has 50k rows in train, 50k in test
        train = data["train"].to_pandas()
        test = data["test"].to_pandas()

        train = common_process(train, label=Labels.toxic, source=_ds_name, filter_by={"label_text": "toxic"})
        test = common_process(test, label=Labels.toxic, source=_ds_name, filter_by={"label_text": "toxic"})

        self._write_data(train=train[0:1000], test=test[0:1000], eval=test[1000:2000])

    def get_data_subdir(self) -> str:
        return f"{_data_path}/"

    def get_file_prefix(self) -> str:
        return _file_name


_oai_ds_name = "mmathys/openai-moderation-api-evaluation"
_oai_ds_file_name = _oai_ds_name.replace("/", "_")


class OAIModerationToxicDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_oai_ds_name, revision="84e5cf3bcd6acb3dfc70b6760451645872218a3e"))
        complete: pd.DataFrame = cast(pd.DataFrame, data["train"].to_pandas())
        complete = process_oai_moderation_data(complete)
        complete = complete.sample(frac=1, random_state=GLOBAL_SEED).reset_index(drop=True)
        complete = complete[complete["category"] == "toxic"]
        train = complete[0 : len(complete) // 2]
        test = complete[len(complete) // 2 : 3 * len(complete) // 4]
        eval = complete[3 * len(complete) // 4 :]

        train = common_process(train, label=Labels.toxic, source=_oai_ds_name, filter_by={"category": "toxic"}, rename={"prompt": "text"})
        test = common_process(test, label=Labels.toxic, source=_oai_ds_name, filter_by={"category": "toxic"}, rename={"prompt": "text"})
        eval = common_process(eval, label=Labels.toxic, source=_oai_ds_name, filter_by={"category": "toxic"}, rename={"prompt": "text"})
        self._write_data(train=train, test=test, eval=test)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_oai_ds_file_name}"

    def get_file_prefix(self) -> str:
        return _oai_ds_file_name


_toxigen_ds_name = "toxigen"


class ToxigenToxicDataset(Data):
    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_toxigen_ds_name}.csv")
        complete = complete.sample(frac=1, random_state=GLOBAL_SEED).reset_index(drop=True)
        complete = complete[complete["label"] == 1]
        train = complete[0 : len(complete) // 2]
        test = complete[len(complete) // 2 : 3 * len(complete) // 4]
        eval = complete[3 * len(complete) // 4 :]
        train = common_process(train, label=Labels.toxic, source=_toxigen_ds_name)
        test = common_process(test, label=Labels.toxic, source=_toxigen_ds_name)
        eval = common_process(eval, label=Labels.toxic, source=_toxigen_ds_name)

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_toxigen_ds_name}"

    def get_file_prefix(self) -> str:
        return _toxigen_ds_name


_jigsaw_ds_name = "jigsaw"


class JigawToxicCommentsDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{_raw_data_path}/{_jigsaw_ds_name}"
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_eval.csv")
        train = common_process(train, label=Labels.toxic, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        test = common_process(test, label=Labels.toxic, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        eval = common_process(eval, label=Labels.toxic, source=_jigsaw_ds_name, rename={"comment_text": "text"})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_jigsaw_ds_name}"

    def get_file_prefix(self) -> str:
        return _jigsaw_ds_name


_wikitoxic_ds_name = "wiki_toxic"


class WikiToxicCommentsDataset(Data):
    """
    source: https://github.com/ewulczyn/wiki-detox
    """

    def load(self) -> None:
        raw_data_dir = f"{_raw_data_path}/{_wikitoxic_ds_name}"
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_wikitoxic_ds_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_wikitoxic_ds_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_wikitoxic_ds_name}_eval.csv")
        train = common_process(train, label=Labels.toxic, source=_wikitoxic_ds_name, rename={"comment": "text"})
        test = common_process(test, label=Labels.toxic, source=_wikitoxic_ds_name, rename={"comment": "text"})
        eval = common_process(eval, label=Labels.toxic, source=_wikitoxic_ds_name, rename={"comment": "text"})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_wikitoxic_ds_name}"

    def get_file_prefix(self) -> str:
        return _wikitoxic_ds_name


class ToxicDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                MTEBToxicDataset(),
                OAIModerationToxicDataset(),
                ToxigenToxicDataset(),
                JigawToxicCommentsDataset(),
                WikiToxicCommentsDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    download_data(ToxicDataset())
    data = ToxicDataset().get_data("train")
