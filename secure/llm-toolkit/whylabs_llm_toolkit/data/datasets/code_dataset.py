# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import Dict, Optional, cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from whylabs_llm_toolkit.data.data import Data, DataGroup, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels

_python_ds_name = "tomekkorbak/python-github-code"
_python_file_name = _python_ds_name.replace("/", "_")

_data_path = f"{data_path()}/topic/code"
_raw_data_path = f"{raw_data_path()}/topic/code"


class PythonDataset(Data):
    def load(self) -> None:
        # tomekkorbak/python-github-code
        # 90k train rows
        # 10k test rows

        python_data = cast(DatasetDict, load_dataset(_python_ds_name, revision="fae4302f2f73ecbd7b057ddf240639f3882749c0"))

        train = cast(pd.DataFrame, python_data["train"].to_pandas())
        test_full = cast(pd.DataFrame, python_data["test"].to_pandas())

        train = train[0:1000]
        test = test_full[-1000:]
        eval = test_full[-2000:-1000]

        train = common_process(train, label=Labels.code, source=_python_ds_name)
        test = common_process(test, label=Labels.code, source=_python_ds_name)
        eval = common_process(eval, label=Labels.code, source=_python_ds_name)

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/python"

    def get_file_prefix(self) -> str:
        return _python_file_name


_js_ds_name = "hsultanbey/javascript"
_js_file_name = _js_ds_name.replace("/", "_")


class JavaScriptDataset(Data):
    def load(self) -> None:
        js_data = cast(DatasetDict, load_dataset(_js_ds_name, revision="5d464a787c23bef5d0b1c251371cd273d9c21e04"))

        # has 100k rows
        train_full = cast(pd.DataFrame, js_data["train"].to_pandas())

        train = train_full[0:1000]
        test = train_full[-1000:]
        eval = train_full[-2000:-1000]

        train = common_process(train, label=Labels.code, source=_js_ds_name, rename={"code": "text"})
        test = common_process(test, label=Labels.code, source=_js_ds_name, rename={"code": "text"})
        eval = common_process(eval, label=Labels.code, source=_js_ds_name, rename={"code": "text"})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/js"

    def get_file_prefix(self) -> str:
        return _js_file_name


_code_parrot_name = "codeparrot/github-code-clean"
_code_parrot_file_name = _code_parrot_name.replace("/", "_")


class CodeParrotDataset(Data):
    """
    Code: https://huggingface.co/datasets/codeparrot/github-code-clean
    Dataset was preprocessed and cleaned: empty strings are removed and texts with less than 5*5 characters are removed
    and the texts are pruned to a max 1024*5 characters.
    The code topic was sampled to get 400 examples of each of 30 different programming languages.
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_code_parrot_file_name}/{_code_parrot_file_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_code_parrot_file_name}/{_code_parrot_file_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_code_parrot_file_name}/{_code_parrot_file_name}_eval.csv")
        train["label"] = 1
        test["label"] = 1
        eval["label"] = 1
        train = train[["text", "label"]]
        test = test[["text", "label"]]
        eval = eval[["text", "label"]]
        train = common_process(
            train,
            label=Labels.code,
            source=_code_parrot_name,
            filter_by={"label": 1},
        )
        test = common_process(
            test,
            label=Labels.code,
            source=_code_parrot_name,
            filter_by={"label": 1},
        )
        eval = common_process(
            eval,
            label=Labels.code,
            source=_code_parrot_name,
            filter_by={"label": 1},
        )

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_code_parrot_file_name}"

    def get_file_prefix(self) -> str:
        return _code_parrot_file_name


class CodeDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        self.js = JavaScriptDataset()
        self.py = PythonDataset()
        self.gh = CodeParrotDataset()
        super().__init__([self.js, self.py, self.gh], size_filter)


if __name__ == "__main__":
    download_data(CodeDataset())
