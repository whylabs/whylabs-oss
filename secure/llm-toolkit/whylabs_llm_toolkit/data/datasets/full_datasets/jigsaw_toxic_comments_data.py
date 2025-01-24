from typing import Dict, Optional

import pandas as pd

from whylabs_llm_toolkit.data.data import Data, DataGroup
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.hate_dataset import JigsawHateCommentsDataset
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.datasets.toxic_dataset import JigawToxicCommentsDataset
from whylabs_llm_toolkit.data.labels import Labels

_jigsaw_ds_name = "jigsaw"


class JigawControlCommentsDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/control/{_jigsaw_ds_name}"
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_train.csv")  # pyright: ignore[reportUnknownMemberType]
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_test.csv")  # pyright: ignore[reportUnknownMemberType]
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jigsaw_ds_name}_eval.csv")  # pyright: ignore[reportUnknownMemberType]
        train = common_process(train, label=Labels.innocuous, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        test = common_process(test, label=Labels.innocuous, source=_jigsaw_ds_name, rename={"comment_text": "text"})
        eval = common_process(eval, label=Labels.innocuous, source=_jigsaw_ds_name, rename={"comment_text": "text"})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/{_jigsaw_ds_name}"

    def get_file_prefix(self) -> str:
        return _jigsaw_ds_name


class JigsawDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                JigawToxicCommentsDataset(),
                JigsawHateCommentsDataset(),
                JigawControlCommentsDataset(),
            ]
        )
        self.size_filter = size_filter or {}


if __name__ == "__main__":
    JigsawDataset()
