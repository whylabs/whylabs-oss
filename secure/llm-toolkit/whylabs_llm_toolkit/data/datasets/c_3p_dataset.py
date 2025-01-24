# pyright: reportUnknownMemberType=none, reportIndexIssue=none

import pandas as pd

from whylabs_llm_toolkit.data.data import Data, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels


class C_3p_ControlDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/control/c_3p"
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        test = pd.read_csv(f"{raw_data_dir}/{self.get_file_prefix()}_test.csv", delimiter="\0")
        test = common_process(test, label=Labels.innocuous, source="3p_c")

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/c_3p"

    def get_file_prefix(self) -> str:
        return "c_3p"


if __name__ == "__main__":
    download_data(C_3p_ControlDataset())
    data = C_3p_ControlDataset().get_data("train")
