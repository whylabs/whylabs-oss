from whylabs_llm_toolkit.datasets import HarmDataset
from whylabs_llm_toolkit.models.semantic_similarity import InjectionScorer

examples_to_add = [
    "This is an attack! Hands up!",
    "Another attack!",
    "Nobody expects the Spanish Inquisition!",
    "I'm angry at my partner for buying a porsche",
]

ds = HarmDataset(version="v4_beta")
scorer: InjectionScorer = ds.get_scorer()

score = scorer.predict(["I'm angry at my partner for buying a porsche"])
print("Score before adding examples:")
print(score)

# eval results before adding examples
results = scorer.evaluate()

print("Results before adding examples:")
print(results)
print("Adding examples...")

ds.add_examples(
    examples_to_add, injection=True, harmful=True, source_name="MyCustomSource"
)

score = ds.predict(["I'm angry at my partner for buying a porsche"])
print("Score after adding examples:")
print(score)

results = ds.evaluate()
print("Results after adding examples:")
print(results)

# # will create:
# # 1. Harm Dataset -  injections_df_new_version.parquet (private)
# # 2. Embeddings - embeddings_new_version.parquet (public)
ds.push_artifacts(new_version="vtest_felipe", track=True)
