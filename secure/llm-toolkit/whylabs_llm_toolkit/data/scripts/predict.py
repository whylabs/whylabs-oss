# pyright: reportUnknownVariableType=false, reportUnknownArgumentType=false, reportUnknownMemberType=false
import time
from typing import List, Union

import pandas as pd
import torch
from setfit import SetFitModel

from whylabs_llm_toolkit.data.labels import all_labels


def predict_probs(model: SetFitModel, text: Union[str, List[str], pd.DataFrame], show_progress_bar=False):  # pyright: ignore[reportUnknownParameterType]
    if isinstance(text, str):
        text = [text]
    elif isinstance(text, pd.DataFrame):
        text = text["text"].tolist()

    start = time.perf_counter()
    batch_size = 32 if not torch.cuda.is_available() else 128
    probs = model.predict_proba(text, show_progress_bar=show_progress_bar, batch_size=batch_size)
    li = probs.tolist()
    end = time.perf_counter()
    print(f"Time taken: {end - start:.2f}s")
    return li


def parse_probs(probs: List[List[float]]) -> pd.DataFrame:
    df = pd.DataFrame(probs, columns=all_labels)
    df = df.transpose()
    df.columns = ["values"]
    df = df.sort_values(by="values", ascending=False)
    return df
