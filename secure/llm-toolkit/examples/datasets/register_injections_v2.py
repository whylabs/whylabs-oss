import os

import pandas as pd

from whylabs_llm_toolkit.datasets import HarmDataset

os.environ["WHYLABS_API_KEY"] = "<api-key>"

ds = HarmDataset(tag="")


df = pd.read_parquet("injections_df_v2.parquet")

dfs = df.groupby(["injection","harmful","source"])

for name, group in dfs:
    is_injection = name[0]
    is_harmful = name[1]
    source = name[2]
    if is_injection==1:
        inputs = group["text"].tolist()
        label = 1
        props = {"injection": str(is_injection), "harmful": str(is_harmful)}
        ds.add_examples(inputs, label, source, **props)

print(ds.df.head())
print(ds.df['source'].value_counts())

ds.push_artifacts(tag="your-tag")
