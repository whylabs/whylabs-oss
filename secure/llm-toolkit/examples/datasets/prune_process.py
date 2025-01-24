import os

os.environ["WHYLABS_API_KEY"] = ""
os.environ["WHYLABS_API_ENDPOINT"] = ""
os.environ["WHYLABS_LLM_TOOLKIT_FORCE_DOWNLOAD"] = "true"

from whylabs_llm_toolkit.datasets.topics_dataset import MedicalDataset
import pandas as pd

# this is in s3://whylabs-datascience/datasets/experiments/llm-toolkit-pruning/negatives_medical.csv
neg_df = pd.read_csv("negatives_medical.csv")
neg_df = neg_df.sample(n=50000).reset_index(drop=True)
texts = neg_df['text'].tolist()


# steps of 500 examples
def negative_results(scorer):
    metrics, chats, index = [], [], []
    df_fp = pd.DataFrame(columns=["score","text","index"])
    for i in range(0,len(texts),500):
        # print(f"{i} to {i+500}")
        res = scorer.predict(texts[i:i+500], return_neighbor=True)
        metrics.extend(res.metrics)
        chats.extend(texts[i:i+500])
        index.extend(res.neighbor_indices)
        df_fp = pd.DataFrame({"score":metrics,"text":chats,"index":index})
    return df_fp

ds = MedicalDataset(tag="dev_pruned")
scorer = ds.get_scorer()
threshold = 0.39

for i in range(5):
    examples_db = ds.df['text'].tolist()

    print("Generating negative results..............")
    df_fp = negative_results(scorer)
    df_fp = df_fp[df_fp['score']>=threshold]
    df_fp.drop_duplicates(subset=['text'],inplace=True)

    ix_counts = df_fp['index'].value_counts()

    to_remove = []
    for ix, count in ix_counts.items():
        if count>=2:
            to_remove.append(ix)

    print(f"Removing {len(to_remove)} examples for iteration {i}..............")
    print("DF and Embeddings Length Before::",len(ds.df),len(ds.df_embeddings))
    ds.remove_examples(to_remove)
    print("DF and Embeddings Length After::",len(ds.df),len(ds.df_embeddings))
    scorer = ds.get_scorer()
    res = scorer.evaluate()
    print(f"Iteration {i} Results::")
    print(res)
    print("#################################")
    # save results to json
    ds.df.to_csv(f"dev_pruned_{i}.csv")
