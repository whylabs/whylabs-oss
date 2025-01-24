from typing import Dict, Optional

from whylabs_llm_toolkit.data.data import DataGroup
from whylabs_llm_toolkit.data.datasets.code_dataset import CodeDataset
from whylabs_llm_toolkit.data.datasets.control_data import ControlDataset
from whylabs_llm_toolkit.data.datasets.financial_dataset import FinancialDataset
from whylabs_llm_toolkit.data.datasets.harmful_dataset import HarmfulDataset
from whylabs_llm_toolkit.data.datasets.hate_dataset import HateDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import InjectionsDataset
from whylabs_llm_toolkit.data.datasets.medical_dataset import MedicalDataset
from whylabs_llm_toolkit.data.datasets.toxic_dataset import ToxicDataset
from whylabs_llm_toolkit.data.labels import Labels


class StandardDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                CodeDataset(),
                InjectionsDataset(),
                MedicalDataset(),
                FinancialDataset(),
                ToxicDataset(),
                HateDataset(),
                ControlDataset(),
                HarmfulDataset(),
            ],
            size_filter=size_filter,
        )


if __name__ == "__main__":
    all_data = StandardDataset()
    all_data.load()
    print(all_data)
