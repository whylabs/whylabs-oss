# pyright: reportUnknownMemberType=none, reportIndexIssue=none
import json
from typing import Dict, Optional, cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)

from langkit.core.workflow import Workflow
from whylabs_llm_toolkit.data.data import Data, DataGroup, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.full_datasets.jigsaw_toxic_comments_data import JigawControlCommentsDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.openai_moderation_dataset import OAIModerationControlDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.toxigen_data import ToxigenControlDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.wiki_toxic_dataset import WikiToxicControlDataset
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels

_ds_name = "nvidia/ChatQA-Training-Data"
_file_name = _ds_name.replace("/", "_")

_intentions_ds_name = "intentions"

_data_path = f"{data_path()}/control"
_raw_data_path = f"{raw_data_path()}/control"


class NVidiaChatQADataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_ds_name, name="drop", revision="164f018cf5e7862ae5ef9c2b8ada47b07e3e3a31"))

        # has 50k rows in train, 50k in test
        train_full = cast(pd.DataFrame, data["train"].to_pandas())
        # Pull the messages out of the weird object format they use
        train_full["messages"] = train_full["messages"].map(lambda it: it[0]["content"])  # pyright: ignore[reportUnknownLambdaType]
        train_full = common_process(train_full, label=Labels.innocuous, source=_ds_name, rename={"messages": "text"})

        train = train_full[0:2000]
        test = train_full[2001:4000]
        eval = train_full[4001:6000]

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/nvidia"

    def get_file_prefix(self) -> str:
        return _file_name


class ManualControlDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{_raw_data_path}/manual"
        train = pd.read_csv(f"{raw_data_dir}/{self.get_file_prefix()}_raw_train.csv")
        train = common_process(train, label=None, source="manual")

        test = pd.read_csv(f"{raw_data_dir}/{self.get_file_prefix()}_raw_test.csv")
        test = common_process(test, label=None, source="manual")

        eval = pd.read_csv(f"{raw_data_dir}/{self.get_file_prefix()}_raw_eval.csv")
        eval = common_process(eval, label=None, source="manual")

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/manual"

    def get_file_prefix(self) -> str:
        return "manual"


class HarmlessIntentionsDataset(Data):
    """
    intentions:
        Size: 226 samples (113 positives, 113 negatives)
        Source: AI-generated (gpt3.5, gpt4)

        This dataset is a collection of sentence pairs: a harmful version and a harmless version of the same prompt.
        The idea is that the pair of sentences should be as similar as possible, except for the harmful intent.
        The aim is to evaluate if the scorer is able to distinguish between the harmful and harmless versions of the prompts."""

    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/harmful"
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_intentions_ds_name}.csv")
        test = test.drop(columns=["harmful"])
        test["label"] = 1
        test = common_process(test, label=Labels.harmful, source=_intentions_ds_name, filter_by={"label": 1}, rename={"harmless": "text"})
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_intentions_ds_name}"

    def get_file_prefix(self) -> str:
        return _intentions_ds_name


_sg_prompt_injections_name = "xTRam1/safe-guard-prompt-injection"
_sg_prompt_injections_file_name = _sg_prompt_injections_name.replace("/", "_")


class SafeGuardPromptInjectionControlDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_sg_prompt_injections_name, revision="a3a877d608f37b7d20d9945671902df895ecdb46"))

        # has 546 rows
        complete = cast(pd.DataFrame, data["test"].to_pandas())
        complete = complete[complete["label"] == 0]  # only keep the innocuous prompts
        complete = complete[["text", "label"]]
        complete["label"] = 1
        complete = common_process(complete, label=Labels.innocuous, source=_sg_prompt_injections_file_name, filter_by={"label": 1})
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        test = complete
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_sg_prompt_injections_file_name}"

    def get_file_prefix(self) -> str:
        return _sg_prompt_injections_file_name


_purple_llama_frr_name = "purplellama_frr"


class PurpleLLamaFRRDataset(Data):
    """
    Source: https://github.com/meta-llama/PurpleLlama/blob/main/CybersecurityBenchmarks/datasets/frr/frr.json
    sha: 3ac036312d84cbb66707fbd6dbe5ef93dc398f97
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        with open(f"{raw_data_dir}/{_purple_llama_frr_name}/{_purple_llama_frr_name}.json", "r") as f:
            raw_json = json.load(f)
        examples = [js["mutated_prompt"] for js in raw_json]
        test = pd.DataFrame({"prompts": examples, "labels": [1] * len(examples)})
        test = common_process(
            test,
            label=Labels.innocuous,
            source=_purple_llama_frr_name,
            filter_by={"label": 1},
            rename={"prompts": "text", "labels": "label"},
        )
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_purple_llama_frr_name}"

    def get_file_prefix(self) -> str:
        return _purple_llama_frr_name


_augmented_control_name = "llm_augmented_frr"


class LLMAugmentedControlDataset(Data):
    """
    LLM Augmented Non-Injections based on examples from the PurpleLlama FRR dataset

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_augmented_control_name}/{_augmented_control_name}.csv")
        complete["label"] = 1
        complete = common_process(complete, label=Labels.innocuous, source=_augmented_control_name, filter_by={"label": 1})
        train = complete
        # train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model"])
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_augmented_control_name}"

    def get_file_prefix(self) -> str:
        return _augmented_control_name


_c3p2_name = "c_3p_2"


class C_3p_2_ControlDataset(Data):
    """
    Additional attacks
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_c3p2_name}/{_c3p2_name}.csv")
        test["label"] = 1
        test = test[["text", "label"]]
        test = common_process(test, label=Labels.innocuous, source=_c3p2_name, filter_by={"label": 1})
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_c3p2_name}"

    def get_file_prefix(self) -> str:
        return _c3p2_name


_augmented_3p_name = "llm_augmented_3p"


class LLMAugmentedControl3PDataset(Data):
    """
    LLM Augmented Non-Injections based on examples from C_3p_ControlDataset
    and C_3p_2_ControlDataset.

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_augmented_3p_name}/{_augmented_3p_name}.csv")
        complete["label"] = 1
        complete = common_process(complete, label=Labels.innocuous, source=_augmented_3p_name, filter_by={"label": 1})
        train = complete
        # train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model"])
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_augmented_3p_name}"

    def get_file_prefix(self) -> str:
        return _augmented_3p_name


class ControlDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                ManualControlDataset(),
                NVidiaChatQADataset(),
                HarmlessIntentionsDataset(),
                OAIModerationControlDataset(),
                JigawControlCommentsDataset(),
                WikiToxicControlDataset(),
                ToxigenControlDataset(),
                LLMAugmentedControlDataset(),
                C_3p_2_ControlDataset(),
                LLMAugmentedControl3PDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    download_data(ControlDataset())
    data = ControlDataset().get_data("train")
