# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import cast

from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from whylabs_llm_toolkit.data.data import Data, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path
from whylabs_llm_toolkit.data.labels import Labels

_ds_name = "dreamerdeo/finqa"
_file_name = _ds_name.replace("/", "_")


class FinancialDataset(Data):
    def load(self) -> None:
        # Manually inspected this revision to verify remote code is safe
        data = cast(DatasetDict, load_dataset(_ds_name, revision="ebf0fda6e42b597b3b301baeba8da9f97e9aef03", trust_remote_code=True))

        # has 6k rows
        train = data["train"].to_pandas()
        train = common_process(train, label=Labels.financial, source=_ds_name, rename={"question": "text"})

        # 1k rows
        test = data["test"].to_pandas()
        test = common_process(test, label=Labels.financial, source=_ds_name, rename={"question": "text"})

        # 883 rows
        eval = data["validation"].to_pandas()
        eval = common_process(eval, label=Labels.financial, source=_ds_name, rename={"question": "text"})

        self._write_data(train=train[0:10_000], test=test[:1000], eval=eval[:1000])

    def get_data_subdir(self) -> str:
        return f"{data_path()}/topic/financial/financial_questions"

    def get_file_prefix(self) -> str:
        return _file_name


if __name__ == "__main__":
    download_data(FinancialDataset())
    data = FinancialDataset().get_data("train")
