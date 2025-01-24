from typing import List

import pandas as pd

from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.scripts.exclusion_list import ExclusionList

if __name__ == "__main__":
    exclusion_list = ExclusionList()

    dfs: List[pd.DataFrame] = []
    splits_data = [StandardDataset()._get_train_data(), StandardDataset()._get_eval_data(), StandardDataset()._get_test_data()]  # pyright: ignore[reportPrivateUsage]
    splits_name = ["train", "eval", "test"]
    for data, split_name in zip(splits_data, splits_name):
        print(f"Finding similar embeddings using Standard Dataset's {split_name} split...")
        df = exclusion_list.generate_exclusion_list(data)
        dfs.append(df)

    complete_uids_to_remove = pd.concat(dfs)
    complete_uids_to_remove.to_csv(exclusion_list.exclusion_list_path, index=False)
