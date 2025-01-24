from whylabs_llm_toolkit.models.semantic_similarity.injection_scorer import InjectionScorerChroma
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
scorer = InjectionScorerChroma(tag="main", encoder_name="all-MiniLM-L6-v2")

examples = ["example 1", "example 2"]

embeddings = model.encode(examples)

results = scorer.predict(embeddings)

# can also pass directly the examples to predict. This will require installing with [eval] or having sentence-transformers installed.
# results = scorer.predict(examples)
print(results)

# can also return the nearest neighbor embeddings by setting return_neighbor=True
resultsNeighbor = scorer.predict(examples, return_neighbor=True)
print("Injection Score: ", resultsNeighbor.metrics)
print("Nearest neighbor: ", resultsNeighbor.neighbor_embeddings)
