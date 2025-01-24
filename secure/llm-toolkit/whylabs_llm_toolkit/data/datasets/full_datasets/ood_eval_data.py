from typing import Dict, Optional

from whylabs_llm_toolkit.data.data import DataGroup
from whylabs_llm_toolkit.data.datasets.c_3p_dataset import C_3p_ControlDataset
from whylabs_llm_toolkit.data.datasets.control_data import (
    C_3p_2_ControlDataset,
    PurpleLLamaFRRDataset,
    SafeGuardPromptInjectionControlDataset,
)
from whylabs_llm_toolkit.data.datasets.full_datasets.market_performance_data import AnthropicWithNemoDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import (
    PurpleLlamaInjectionsDataset,
    SafeGuardPromptInjectionDataset,
)
from whylabs_llm_toolkit.data.datasets.medical_dataset import MedicalMeadowWikiDocDataset
from whylabs_llm_toolkit.data.labels import Labels


def get_ood_eval_data(label_name: str) -> Optional[DataGroup]:
    if label_name == "injection":
        return InjectionOODDataset()
    if label_name == "malicious":
        return MaliciousOODDataset()
    if label_name == "medical":
        return MedicalOODDataset()
    return None


class InjectionOODDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                SafeGuardPromptInjectionControlDataset(),
                SafeGuardPromptInjectionDataset(),
                C_3p_ControlDataset(),
                PurpleLLamaFRRDataset(),
                PurpleLlamaInjectionsDataset(),
                C_3p_2_ControlDataset(),
            ],
            size_filter=size_filter,
        )


class MaliciousOODDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                AnthropicWithNemoDataset(),
            ],
            size_filter=size_filter,
        )


class MedicalOODDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                MedicalMeadowWikiDocDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    all_data = InjectionOODDataset()
    all_data.load()
    print(all_data)
