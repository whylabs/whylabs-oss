import time
import pandas as pd
import numpy as np
import numpy.typing as npt
from whylabs_llm_toolkit.datasets.base import Dataset
from whylabs_llm_toolkit.eval.benchmarks.topics_benchmark import TopicsBenchmark
from transformers import Pipeline, pipeline  # type: ignore
from whylabs_llm_toolkit.models.base import Scorer
from sentence_transformers import SentenceTransformer
from typing import List, Sequence, Union, Optional
from whylabs_llm_toolkit.models.base import ScorerResult

topics_benchmark = TopicsBenchmark(auto_threshold=True, topic="medical", n=5000)


pipeline= pipeline(
        "zero-shot-classification",
        model="MoritzLaurer/xtremedistil-l6-h256-zeroshot-v1.1-all-33",
        device="cpu",
    )

topics = ["medicine"]
hypothesis_template = "This example is about {}"


class LangkitScorer(Scorer):
    def __init__(self):
        self.times = []
    def predict(self, inputs: List[str],
                return_neighbor: Optional[bool] = None) -> Union[ScorerResult, Sequence[float]]:
        if isinstance(input, List):
            time_start = time.time()
            res = pipeline(inputs, topics, hypothesis_template=hypothesis_template, multi_label=True)
            time_end = time.time()
            self.times.append(time_end - time_start)
            return [x['scores'][0] for x in res]
        else:
            raise ValueError("Invalid input type.")

zs_scorer = LangkitScorer()
results = topics_benchmark.run(zs_scorer)
print("Zeroshot Results::::")
print(results)
print("len times:", len(zs_scorer.times))
print("Time::::", sum(zs_scorer.times))


print("#####################")
print("Vector DB Results::::")

df = pd.read_parquet("medical_dataset.parquet")
df = df.sample(n=5000)
class MedicalDataset(Dataset):
    def __init__(self, tag: str, encoder_name: str = "all-MiniLM-L6-v2"):
        super().__init__("medical_test", tag, encoder_name)

ds = MedicalDataset(tag="")
print("adding examples...")
ds.add_examples(df["text"].tolist(), label=1, source="test")
print("done adding examples.")
scorer = ds.get_scorer()
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings_df = ds.df_embeddings

# sizes = [500, 1000, 2000, 3000, 4000, 5000]
sizes = [5000]

for size in sizes:
    print(f"Size: {size}")
    sampled_embs = embeddings_df.sample(n=size)
    scorer.set_reference_embeddings(sampled_embs)
    class MedicalScorer(Scorer):
        def __init__(self, model, scorer):
            self.model = model
            self.scorer = scorer
            self.times = []

        def predict(self, inputs):
            embeddings = self.model.encode(inputs)
            time_start = time.time()
            res = self.scorer.predict(embeddings)
            time_end = time.time()
            self.times.append(time_end - time_start)
            return res

    medical_scorer = MedicalScorer(model, scorer)
    results_ds_scorer = topics_benchmark.run(medical_scorer)
    print(results_ds_scorer)
    print("len times:", len(medical_scorer.times))
    print("Time::::", sum(medical_scorer.times))
    print("#####################")

