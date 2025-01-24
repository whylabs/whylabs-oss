from typing import List, cast

import numpy as np
import numpy.typing as npt
import pandas as pd
from sklearn.decomposition import PCA

from langkit.core.context import Context
from langkit.core.metric import Metric, MultiMetric, MultiMetricResult
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency


def pca_step(embedding_choice: EmbeddingChoiceArg = "default") -> Metric:
    embedding_dep = EmbeddingContextDependency(embedding_choice=embedding_choice, input_column="text", _show_progress=True)

    def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
        embeddings = cast(List[List[float]], embedding_dep.get_request_data(context).tolist())  # pyright: ignore[reportUnknownMemberType]

        pca = PCA(n_components=3)
        pca_coordinates = cast(npt.NDArray[np.float64], pca.fit_transform(embeddings))  # pyright: ignore[reportUnknownMemberType]
        outputs = {"pca": pca}

        # Convenit place to also return the generated embeddings as a result from the context
        return MultiMetricResult(metrics=[pca_coordinates.tolist(), embeddings], outputs=outputs)

    return MultiMetric(
        names=["coordinates", "embeddings"],
        input_names=["text"],
        context_dependencies=[embedding_dep],
        evaluate=udf,
    )
