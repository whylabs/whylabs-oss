import json
from typing import Dict, Optional

import pandas as pd

from whylabs_llm_toolkit.data.data import Data, DataGroup
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path, raw_data_path
from whylabs_llm_toolkit.data.labels import Labels

_anthropic_helpful_file_name = "anthropic_helpful_helpful_moderation_results.json"


class AnthropicHelpfulDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/control/anthropic_helpful"
        helpful_path = f"{raw_data_dir}/{_anthropic_helpful_file_name}"
        with open(helpful_path) as f:
            data = json.load(f)
        texts = [js["prompt"] for js in data]
        nemo_preds = [js["jailbreak"] for js in data]
        nemo_latencies = [js["latency"] for js in data]
        models = [js["model"] for js in data]
        preds_nemo = [1 if pred == "yes" else 0 for pred in nemo_preds]
        test = pd.DataFrame()
        test["text"] = texts
        test = common_process(test, label=Labels.innocuous, source="anthropic_helpful")
        assert len(test) == len(texts)
        test["prediction_nemo"] = preds_nemo
        test["latency_nemo"] = nemo_latencies
        test["model"] = models
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction_nemo", "latency_nemo", "model", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction_nemo", "latency_nemo", "model", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/anthropic_helpful"

    def get_file_prefix(self) -> str:
        return "anthropic_helpful"


_anthropic_harmful_file_name = "anthropic_harmful_short_harmful_moderation_results.json"


class AnthropicHarmfulDataset(Data):
    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/harmful/anthropic_red_team"
        helpful_path = f"{raw_data_dir}/{_anthropic_harmful_file_name}"
        with open(helpful_path) as f:
            data = json.load(f)
        texts = [js["prompt"] for js in data]
        nemo_preds = [js["jailbreak"] for js in data]
        nemo_latencies = [js["latency"] for js in data]
        models = [js["model"] for js in data]
        preds_nemo = [1 if pred == "yes" else 0 for pred in nemo_preds]
        test = pd.DataFrame()
        test["text"] = texts
        test = common_process(test, label=Labels.harmful, source="anthropic_redteam")
        assert len(test) == len(texts)
        test["prediction_nemo"] = preds_nemo
        test["latency_nemo"] = nemo_latencies
        test["model"] = models
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction_nemo", "latency_nemo", "model", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction_nemo", "latency_nemo", "model", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/harmful/anthropic_red_team"

    def get_file_prefix(self) -> str:
        return "anthropic_harmful"


_safeguard_injection_file_name = "safeguard_nemo_injection_results.csv"


class SafeguardInjectionDataset(Data):
    """
    The data was sampled from SafeGuardPromptInjectionControlDataset and SafeGuardPromptInjectionDataset,
    50 positive and 50 negative samples. The data was processed by Nemo Guardrails with the selfcheck rail,
    see metadata columns for more info.
    """

    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/injections/safeguard_nemo_results"
        data_path = f"{raw_data_dir}/{_safeguard_injection_file_name}"
        df = pd.read_csv(data_path)  # pyright: ignore[reportUnknownMemberType]
        test = common_process(df, label=Labels.injection, source="safeguard_nemo_injection")
        test["prediction"] = df["prediction"]
        test["metadata"] = df["metadata"]
        test["latency"] = df["latency"]
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "metadata", "latency", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "metadata", "latency", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/injections/safeguard_nemo_results"

    def get_file_prefix(self) -> str:
        return "safeguard_nemo_injection_results.csv"


_safeguard_control_file_name = "safeguard_nemo_control_results"


class SafeguardControlDataset(Data):
    """
    The data was sampled from SafeGuardPromptInjectionControlDataset and SafeGuardPromptInjectionDataset,
    50 positive and 50 negative samples. The data was processed by Nemo Guardrails with the selfcheck rail,
    see metadata columns for more info.
    """

    def load(self) -> None:
        raw_data_dir = f"{raw_data_path()}/control/safeguard_nemo_results"
        data_path = f"{raw_data_dir}/{_safeguard_control_file_name}.csv"
        df = pd.read_csv(data_path)  # pyright: ignore[reportUnknownMemberType]
        test = common_process(df, label=Labels.innocuous, source="safeguard_nemo_injection")
        test["prediction"] = df["prediction"]
        test["metadata"] = df["metadata"]
        test["latency"] = df["latency"]
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "metadata", "latency", "uid"])
        eval = pd.DataFrame(columns=["text", "label", "dataset", "source", "prediction", "metadata", "latency", "uid"])

        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{data_path()}/control/safeguard_nemo_results"

    def get_file_prefix(self) -> str:
        return "safeguard_nemo_control_results"


class AnthropicWithNemoDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                AnthropicHarmfulDataset(),
                AnthropicHelpfulDataset(),
            ]
        )
        self.size_filter = size_filter or {}


class SafeguardNemoInjectionDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                SafeguardControlDataset(),
                SafeguardInjectionDataset(),
            ]
        )
        self.size_filter = size_filter or {}


if __name__ == "__main__":
    SafeguardNemoInjectionDataset()
    AnthropicWithNemoDataset()
