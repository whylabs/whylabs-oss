from typing import List

import numpy as np
import pandas as pd

from langkit.core.metric import MetricCreator
from langkit.core.workflow import Workflow
from langkit.metrics.library import lib


def test_embedding():
    metrics: List[MetricCreator] = [lib.prompt.util.embedding(), lib.response.util.embedding()]

    wf = Workflow(metrics=metrics)

    sentence = "test sentence"
    df = pd.DataFrame({"prompt": [sentence] * 3, "response": [sentence] * 3})

    result = wf.run(df)
    result_metrics = result.metrics
    prompt_embedding = result_metrics["prompt.util.embedding"].tolist()  # pyright: ignore[reportUnknownVariableType]
    prompt_embedding_ids = result_metrics["prompt.util.embedding_id"].tolist()  # pyright: ignore[reportUnknownVariableType]
    response_embedding = result_metrics["response.util.embedding"].tolist()  # pyright: ignore[reportUnknownVariableType]
    response_embedding_ids = result_metrics["response.util.embedding_id"].tolist()  # pyright: ignore[reportUnknownVariableType]

    assert prompt_embedding_ids == response_embedding_ids
    assert np.asarray(prompt_embedding).shape == (3, 384)  # pyright: ignore[reportUnknownArgumentType]
    assert np.asarray(response_embedding).shape == (3, 384)  # pyright: ignore[reportUnknownArgumentType]
