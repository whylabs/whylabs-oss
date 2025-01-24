from typing import Dict, Optional

from whylabs_llm_toolkit.data.data import DataGroup
from whylabs_llm_toolkit.data.datasets.c_3p_dataset import C_3p_ControlDataset
from whylabs_llm_toolkit.data.datasets.code_dataset import CodeDataset
from whylabs_llm_toolkit.data.datasets.control_data import ControlDataset
from whylabs_llm_toolkit.data.datasets.financial_dataset import FinancialDataset
from whylabs_llm_toolkit.data.datasets.hate_dataset import HateDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import InjectionsDataset
from whylabs_llm_toolkit.data.datasets.medical_dataset import MedicalDataset
from whylabs_llm_toolkit.data.datasets.toxic_dataset import ToxicDataset
from whylabs_llm_toolkit.data.labels import Labels


class C_3p_Dataset(DataGroup):
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
                C_3p_ControlDataset(),
            ]
        )
        self.size_filter = size_filter or {}


if __name__ == "__main__":
    all_data = C_3p_Dataset()
    all_data.load()
    print(all_data)
