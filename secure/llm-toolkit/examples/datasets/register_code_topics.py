import os

import pandas as pd

from whylabs_llm_toolkit.datasets.base import Dataset
from whylabs_llm_toolkit.eval.benchmarks.topics_benchmark import TopicsBenchmark

os.environ["WHYLABS_API_KEY"] = "<api-key>"


class CodeDataset(Dataset):
    def __init__(self, tag: str, encoder_name: str = "all-MiniLM-L6-v2"):
        super().__init__("code", tag, encoder_name)

ds = CodeDataset(tag="")


df = pd.read_parquet("topics_ds_v2.parquet")

df = df[df["split"] == "train"]
df = df[df["topic"] == "code"]
print(len(df))
ds.add_examples(df["text"].tolist(), label=1, source="codeparrot-github-code-clean")

scorer = ds.get_scorer()

topics_benchmark = TopicsBenchmark(auto_threshold=True, topic="code")

results = topics_benchmark.run(scorer)

print(results)
