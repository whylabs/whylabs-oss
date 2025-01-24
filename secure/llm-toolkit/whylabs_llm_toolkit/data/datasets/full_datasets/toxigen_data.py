from typing import Dict, Optional

import pandas as pd

from whylabs_llm_toolkit.data.data import Data, DataGroup
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.datasets.toxic_dataset import ToxigenToxicDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts import GLOBAL_SEED

_toxigen_ds_name = "toxigen"


class ToxigenControlDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/toxic"
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_toxigen_ds_name}.csv")  # pyright: ignore[reportUnknownMemberType]
        complete = complete.sample(frac=1, random_state=GLOBAL_SEED).reset_index(drop=True)
        complete = complete[complete["label"] == 0]
        train = complete[0 : len(complete) // 2]
        test = complete[len(complete) // 2 : 3 * len(complete) // 4]
        eval = complete[3 * len(complete) // 4 :]
        train = common_process(train, label=Labels.innocuous, source=_toxigen_ds_name)
        test = common_process(test, label=Labels.innocuous, source=_toxigen_ds_name)
        eval = common_process(eval, label=Labels.innocuous, source=_toxigen_ds_name)

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/{_toxigen_ds_name}"

    def get_file_prefix(self) -> str:
        return _toxigen_ds_name


class ToxigenDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                ToxigenToxicDataset(),
                ToxigenControlDataset(),
            ]
        )
        self.size_filter = size_filter or {}


if __name__ == "__main__":
    ToxigenDataset()
