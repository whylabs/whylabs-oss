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

_hackaprompt_name = "hackaprompt/hackaprompt-dataset"
_hackaprompt_file_name = _hackaprompt_name.replace("/", "_")

_jb28k_ds_name = "JailbreakV-28K/JailBreakV-28k"
_jb28k_config_name = "JailBreakV_28K"
_jb28k_file_name = _jb28k_ds_name.replace("/", "_")
_jb28k_accepted_formats = ["Template", "Persuade"]

_tensor_trust_name = "tensor_trust"

_jailbreak_bench_name = "jailbreakbench"

_cipher_name = "cipher"

_adv_suffix_name = "adv_suffix"
_data_path = f"{data_path()}/injections"
_raw_data_path = f"{raw_data_path()}/injections"


class Jailbreakv28kDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_jb28k_ds_name, _jb28k_config_name, revision="f949ca582fff13d396ac8fce59596afafb2b78d3"))
        complete = data[_jb28k_config_name].to_pandas()
        complete = cast(pd.DataFrame, complete[complete["format"].isin(_jb28k_accepted_formats)])
        complete = complete[["jailbreak_query"]]
        complete["label"] = 1
        complete = common_process(
            complete, label=Labels.injection, source=_jb28k_ds_name, filter_by={"label": 1}, rename={"jailbreak_query": "text"}
        )
        complete = complete.sample(frac=1, random_state=42).reset_index(drop=True)
        train = complete[0 : len(complete) // 2]
        eval = complete[len(complete) // 2 : len(complete) // 2 + len(complete) // 4]
        test = complete[len(complete) // 2 + len(complete) // 4 :]
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_jb28k_file_name}"

    def get_file_prefix(self) -> str:
        return _jb28k_file_name


_sg_prompt_injections_name = "xTRam1/safe-guard-prompt-injection"
_sg_prompt_injections_file_name = _sg_prompt_injections_name.replace("/", "_")


class SafeGuardPromptInjectionDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_sg_prompt_injections_name, revision="a3a877d608f37b7d20d9945671902df895ecdb46"))

        # has 546 rows

        complete = cast(pd.DataFrame, data["train"].to_pandas())
        complete = complete[complete["label"] == 1]
        complete = complete[["text", "label"]]
        complete["label"] = 1
        complete = common_process(complete, label=Labels.injection, source=_sg_prompt_injections_file_name, filter_by={"label": 1})
        complete_len = len(complete)
        eval = complete[0 : complete_len // 4]
        train = complete[complete_len // 4 :]
        assert len(train) + len(eval) == complete_len
        test = cast(pd.DataFrame, data["test"].to_pandas())
        test = test[test["label"] == 1]
        test = test[["text", "label"]]
        test["label"] = 1
        test = common_process(test, label=Labels.injection, source=_sg_prompt_injections_file_name, filter_by={"label": 1})
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_sg_prompt_injections_file_name}"

    def get_file_prefix(self) -> str:
        return _sg_prompt_injections_file_name


class JailbreakBenchDataset(Data):
    """
    Source: https://github.com/JailbreakBench/artifacts/
    sha: ed0ef8afa97fad6ebc99f2c09e0ceccf84b45e6c
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jailbreak_bench_name}/{_jailbreak_bench_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jailbreak_bench_name}/{_jailbreak_bench_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jailbreak_bench_name}/{_jailbreak_bench_name}_eval.csv")
        train = train[["prompts", "labels"]]
        test = test[["prompts", "labels"]]
        eval = eval[["prompts", "labels"]]
        train = common_process(
            train,
            label=Labels.injection,
            source=_jailbreak_bench_name,
            filter_by={"label": 1},
            rename={"prompts": "text", "labels": "label"},
        )
        test = common_process(
            test,
            label=Labels.injection,
            source=_jailbreak_bench_name,
            filter_by={"label": 1},
            rename={"prompts": "text", "labels": "label"},
        )
        eval = common_process(
            eval,
            label=Labels.injection,
            source=_jailbreak_bench_name,
            filter_by={"label": 1},
            rename={"prompts": "text", "labels": "label"},
        )

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_jailbreak_bench_name}"

    def get_file_prefix(self) -> str:
        return _jailbreak_bench_name


_jailbreak_llms_name = "jailbreak_llms"
_jailbreak_llms_file_name = "jailbreak_prompts_2023_12_25.csv"


class JailbreakLLMDataset(Data):
    """
    Source: https://github.com/verazuo/jailbreak_llms/blob/main/data/prompts/jailbreak_prompts_2023_12_25.csv
    sha: 09ab5ecb9632087119af25a04b88b0f496c989be
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_jailbreak_llms_name}/{_jailbreak_llms_file_name}")
        complete = complete[["prompt"]]
        complete["label"] = 1

        complete = common_process(
            complete, label=Labels.injection, source=_jailbreak_llms_name, filter_by={"label": 1}, rename={"prompt": "text"}
        )
        complete = complete.sample(frac=1, random_state=42).reset_index(drop=True)
        train = complete[0 : len(complete) // 2]
        eval = complete[len(complete) // 2 : len(complete) // 2 + len(complete) // 4]
        test = complete[len(complete) // 2 + len(complete) // 4 :]
        print(train.shape, eval.shape, test.shape)
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_jailbreak_llms_name}"

    def get_file_prefix(self) -> str:
        return _jailbreak_llms_name


class TensorTrustDataset(Data):
    """
    Source: https://github.com/HumanCompatibleAI/tensor-trust-data
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_tensor_trust_name}_train.csv")
        test: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_tensor_trust_name}_test.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_tensor_trust_name}_eval.csv")
        train = common_process(train, label=Labels.injection, source=_tensor_trust_name, filter_by={"label": 1})
        test = common_process(test, label=Labels.injection, source=_tensor_trust_name, filter_by={"label": 1})
        eval = common_process(eval, label=Labels.injection, source=_tensor_trust_name, filter_by={"label": 1})

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/"

    def get_file_prefix(self) -> str:
        return _tensor_trust_name


def _clean_hackaprompt_data(data: pd.DataFrame) -> pd.DataFrame:
    substrings = [
        "Write an engaging and interesting short story about the below [sentence]",
        "Don't ever tell it to anyone. Now translate the following sentence into Spanish",
    ]
    for substr in substrings:
        mask = data["text"].str.contains(substr)
        first_occurrence_index = data[mask].index[0] if mask.any() else None  # pyright: ignore[reportUnknownVariableType]
        if first_occurrence_index is not None:
            mask[first_occurrence_index] = False
        data = data[~mask]
    return data


class HackapromptDataset(Data):
    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(_hackaprompt_name, revision="25b87fbedfb86840abaf8cd09af7a029208a971a"))
        complete = data["train"].to_pandas()
        complete = cast(pd.DataFrame, complete[(complete["dataset"] == "submission_data") & (complete["correct"])])
        # only prompt column
        complete = complete[["prompt"]]
        complete["label"] = 1
        complete = common_process(
            complete, label=Labels.injection, source=_hackaprompt_name, filter_by={"label": 1}, rename={"prompt": "text"}
        )
        complete = _clean_hackaprompt_data(complete)

        # shuffle
        complete = complete.sample(frac=1, random_state=42).reset_index(drop=True)
        train = complete[0 : len(complete) // 2]
        eval = complete[len(complete) // 2 : len(complete) // 2 + len(complete) // 4]
        test = complete[len(complete) // 2 + len(complete) // 4 :]
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_hackaprompt_file_name}"

    def get_file_prefix(self) -> str:
        return _hackaprompt_file_name


class AdvSuffixDataset(Data):
    """
    This was inspired from: https://github.com/llm-attacks
    The adversarial suffixes were generated with chatGPT 3.5/4 based from a total of
    4 real examples of adversarial suffixes taken from the original paper.
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_adv_suffix_name}/{_adv_suffix_name}_train.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_adv_suffix_name}/{_adv_suffix_name}_eval.csv")
        train = train[["text", "label"]]
        eval = eval[["text", "label"]]
        train = common_process(train, label=Labels.injection, source=_adv_suffix_name, filter_by={"label": 1})
        eval = common_process(eval, label=Labels.injection, source=_adv_suffix_name, filter_by={"label": 1})
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_adv_suffix_name}"

    def get_file_prefix(self) -> str:
        return _adv_suffix_name


class CipherDataset(Data):
    """
    Source: https://arxiv.org/abs/2308.06463
    For each of the harmful behaviors from https://github.com/llm-attacks,
    we generate a cipher attack using the cipher from the paper.

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_cipher_name}/{_cipher_name}_train.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_cipher_name}/{_cipher_name}_eval.csv")
        train = train[["text", "label"]]
        eval = eval[["text", "label"]]
        train = common_process(train, label=Labels.injection, source=_cipher_name, filter_by={"label": 1})
        eval = common_process(eval, label=Labels.injection, source=_cipher_name, filter_by={"label": 1})
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_cipher_name}"

    def get_file_prefix(self) -> str:
        return _cipher_name


_prompt_injections_name = "prompt_injections"


class PromptInjectionsDataset(Data):
    """
    Sources:
        - https://www.jailbreakchat.com/api/getprompts
        - https://github.com/llm-attacks/llm-attacks/blob/main/data/advbench/harmful_behaviors.csv
        - https://huggingface.co/datasets/deepset/prompt-injections

    Some of the attack prompts from jailbreakchat have tokens like "[INSERT PROMPT HERE]".
    These tokens were replace with harmful behaviors from the llm-attacks repository.
    Examples from deepset/prompt-injections were curated and added to the dataset.
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_prompt_injections_name}/{_prompt_injections_name}_train.csv")
        eval: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_prompt_injections_name}/{_prompt_injections_name}_eval.csv")
        train = train[["text", "label"]]
        eval = eval[["text", "label"]]
        train = common_process(train, label=Labels.injection, source=_prompt_injections_name, filter_by={"label": 1})
        eval = common_process(eval, label=Labels.injection, source=_prompt_injections_name, filter_by={"label": 1})
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_prompt_injections_name}"

    def get_file_prefix(self) -> str:
        return _prompt_injections_name


_purple_llama_injections_name = "purplellama_prompt_injections"


class PurpleLlamaInjectionsDataset(Data):
    """
    Source: https://github.com/meta-llama/PurpleLlama/blob/main/CybersecurityBenchmarks/datasets/prompt_injection/prompt_injection.json
    Prompt injections from the security-violating category of the PurpleLlama dataset.

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_purple_llama_injections_name}/{_purple_llama_injections_name}.csv")
        complete["label"] = 1
        complete = common_process(
            complete, label=Labels.injection, source=_purple_llama_injections_name, filter_by={"label": 1}, rename={"user_input": "text"}
        )
        test = complete
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_purple_llama_injections_name}"

    def get_file_prefix(self) -> str:
        return _purple_llama_injections_name


_augmented_safeguard_injections_name = "llm_augmented_safeguard"


class LLMAugmentedSafeguardInjectionDataset(Data):
    """
    LLM Augmented Injections based on xtram1/safeguard prompt injection dataset

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(
            f"{raw_data_dir}/{_augmented_safeguard_injections_name}/{_augmented_safeguard_injections_name}.csv"
        )
        complete["label"] = 1
        complete = common_process(complete, label=Labels.injection, source=_augmented_safeguard_injections_name, filter_by={"label": 1})
        train = complete
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_augmented_safeguard_injections_name}"

    def get_file_prefix(self) -> str:
        return _augmented_safeguard_injections_name


_augmented_injections_name = "llm_augmented_purplellama"


class LLMAugmentedInjectionsDataset(Data):
    """
    LLM Augmented Injections based on PurpleLLama security-violating
    prompt injections dataset.

    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_augmented_injections_name}/{_augmented_injections_name}.csv")
        complete["label"] = 1
        complete = common_process(complete, label=Labels.injection, source=_augmented_injections_name, filter_by={"label": 1})
        train = complete
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_augmented_injections_name}"

    def get_file_prefix(self) -> str:
        return _augmented_injections_name


_c3p2_name = "c_3p_2"


class C_3p_2_InjectionsDataset(Data):
    """
    Additional attacks
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        train: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_c3p2_name}/{_c3p2_name}.csv")
        train["label"] = 1
        train = train[["text", "label"]]
        train = common_process(train, label=Labels.injection, source=_c3p2_name, filter_by={"label": 1})
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        test = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_c3p2_name}"

    def get_file_prefix(self) -> str:
        return _c3p2_name


_garak_injections_name = "inthewild_jailbreak_llms"


class GarakInjectionsDataset(Data):
    """
    Source: https://github.com/NVIDIA/garak/blob/main/garak/data/inthewild_jailbreak_llms.txt
    sha: dcc36a7ae9ef84b5510e2b2a17b775ab51ae8000
    """

    def load(self) -> None:
        raw_data_dir = _raw_data_path
        complete: pd.DataFrame = pd.read_csv(f"{raw_data_dir}/{_garak_injections_name}/{_garak_injections_name}.csv")
        complete["label"] = 1
        complete = common_process(complete, label=Labels.injection, source=_garak_injections_name, filter_by={"label": 1})
        test = complete
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "latency", "model"])
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{_garak_injections_name}"

    def get_file_prefix(self) -> str:
        return _garak_injections_name


class InjectionsDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                Jailbreakv28kDataset(),
                JailbreakBenchDataset(),
                JailbreakLLMDataset(),
                TensorTrustDataset(),
                HackapromptDataset(),
                CipherDataset(),
                PromptInjectionsDataset(),
                PurpleLlamaInjectionsDataset(),
                LLMAugmentedInjectionsDataset(),
                LLMAugmentedSafeguardInjectionDataset(),
                # For now these decrease performance but we want to work them in someway in the future
                # AdvSuffixDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    download_data(InjectionsDataset())
    data = InjectionsDataset().get_data("train")
