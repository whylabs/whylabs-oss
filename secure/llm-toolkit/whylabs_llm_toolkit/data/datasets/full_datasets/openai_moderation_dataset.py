from typing import Dict, Optional, cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from whylabs_llm_toolkit.data.data import Data, DataGroup
from whylabs_llm_toolkit.data.datasets.data_process import common_process, process_oai_moderation_data
from whylabs_llm_toolkit.data.datasets.hate_dataset import OAIModerationHateDataset
from whylabs_llm_toolkit.data.datasets.paths import data_path
from whylabs_llm_toolkit.data.datasets.toxic_dataset import OAIModerationToxicDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts import GLOBAL_SEED

_oai_ds_name = "mmathys/openai-moderation-api-evaluation"
_oai_ds_file_name = _oai_ds_name.replace("/", "_")


# this is separated from other control datasets because they are "hard" negatives and ofter overlap with other datasets, like medical
class OAIModerationControlDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_oai_ds_name, revision="84e5cf3bcd6acb3dfc70b6760451645872218a3e"))
        complete: pd.DataFrame = cast(pd.DataFrame, data["train"].to_pandas())
        complete = process_oai_moderation_data(complete)
        complete = complete.sample(frac=1, random_state=GLOBAL_SEED).reset_index(drop=True)
        complete = complete[complete["category"] == "negative"]
        train = complete[0 : len(complete) // 2]
        test = complete[len(complete) // 2 : 3 * len(complete) // 4]
        eval = complete[3 * len(complete) // 4 :]

        train = common_process(
            train, label=Labels.innocuous, source=_oai_ds_name, filter_by={"category": "negative"}, rename={"prompt": "text"}
        )
        test = common_process(
            test, label=Labels.innocuous, source=_oai_ds_name, filter_by={"category": "negative"}, rename={"prompt": "text"}
        )
        eval = common_process(
            eval, label=Labels.innocuous, source=_oai_ds_name, filter_by={"category": "negative"}, rename={"prompt": "text"}
        )
        self._write_data(train=train, test=test, eval=test)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/{_oai_ds_file_name}"

    def get_file_prefix(self) -> str:
        return _oai_ds_file_name


class OpenAIModerationDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                OAIModerationToxicDataset(),
                OAIModerationHateDataset(),
                OAIModerationControlDataset(),
            ]
        )
        self.size_filter = size_filter or {}


if __name__ == "__main__":
    OpenAIModerationDataset()
