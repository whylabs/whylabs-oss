from whylabs_llm_toolkit.data.datasets.control_data import SafeGuardPromptInjectionControlDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.c_3p_data import C_3p_Dataset
from whylabs_llm_toolkit.data.datasets.full_datasets.jigsaw_toxic_comments_data import JigsawDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.market_performance_data import AnthropicWithNemoDataset, SafeguardNemoInjectionDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.ood_eval_data import InjectionOODDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.openai_moderation_dataset import OpenAIModerationDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.toxigen_data import ToxigenDataset
from whylabs_llm_toolkit.data.datasets.full_datasets.wiki_toxic_dataset import WikiToxicDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import (
    GarakInjectionsDataset,
    LLMAugmentedSafeguardInjectionDataset,
    SafeGuardPromptInjectionDataset,
)
from whylabs_llm_toolkit.data.datasets.medical_dataset import MedicalMeadowWikiDocDataset

if __name__ == "__main__":
    datasets = [
        C_3p_Dataset(),
        StandardDataset(),
        InjectionOODDataset(),
        OpenAIModerationDataset(),
        ToxigenDataset(),
        JigsawDataset(),
        AnthropicWithNemoDataset(),
        SafeguardNemoInjectionDataset(),
        MedicalMeadowWikiDocDataset(),
        WikiToxicDataset(),
        SafeGuardPromptInjectionControlDataset(),
        SafeGuardPromptInjectionDataset(),
        GarakInjectionsDataset(),
        LLMAugmentedSafeguardInjectionDataset(),
    ]
    for dataset in datasets:
        data = dataset.load()
        print(data)
