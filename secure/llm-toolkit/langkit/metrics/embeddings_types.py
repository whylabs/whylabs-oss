from typing import Any, Dict, List, Protocol, Tuple, TypedDict, Union, cast

import numpy as np
import numpy.typing as npt
import torch
from optimum.onnxruntime import ORTModel
from optimum.onnxruntime.modeling_ort import BaseModelOutput
from sentence_transformers import SentenceTransformer
from transformers import Pipeline, PreTrainedTokenizerBase


class EmbeddingEncoder(Protocol):
    def encode(self, text: Tuple[str, ...], **kwargs: Any) -> Union["torch.Tensor", npt.NDArray[np.float64]]:
        ...


class TransformerEmbeddingAdapter(EmbeddingEncoder):
    def __init__(self, transformer: SentenceTransformer):
        self._transformer = transformer

    def encode(self, text: Tuple[str, ...], **kwargs: Any) -> "torch.Tensor":
        keyword_args: Dict[str, Any] = {"show_progress_bar": False}
        keyword_args.update(kwargs)
        return self._transformer.encode(sentences=list(text), convert_to_tensor=True, **keyword_args)  # pyright: ignore[reportUnknownMemberType]


# In theory this should work also, just need to work the mean pooling into it
class OnnxPipelineEmbeddingAdapter(EmbeddingEncoder):
    def __init__(self, pipeline: Pipeline):
        self._pipeline = pipeline

    def encode(self, text: Tuple[str, ...], **kwargs: Any) -> "torch.Tensor":
        result = cast(List[torch.Tensor], self._pipeline(list(text), **kwargs))

        # Apply mean pooling to each item
        pooled_result: List[torch.Tensor] = []
        for item in result:
            # Mean pooling: average over the token dimension (dim=1)
            pooled_item = torch.mean(item, dim=1).squeeze()
            pooled_result.append(pooled_item)

        # Stack the pooled results
        final_result = torch.stack(pooled_result)

        return final_result


class _TokenizerOutput(TypedDict):
    input_ids: torch.Tensor
    attention_mask: torch.Tensor


class ORTModelTokenizerAdapter(EmbeddingEncoder):
    def __init__(self, model: ORTModel, tokenizer: PreTrainedTokenizerBase):
        self._model = model
        self._tokenizer = tokenizer

    # Use numpy instead of torch for mean pooling when doing onnx
    def _mean_pooling(self, token_embeddings: Any, attention_mask: Any):
        input_mask_expanded = np.expand_dims(attention_mask, -1).astype(np.float32)
        sum_embeddings = np.sum(token_embeddings * input_mask_expanded, axis=1)
        sum_mask = np.clip(np.sum(input_mask_expanded, axis=1), a_min=1e-9, a_max=None)
        return sum_embeddings / sum_mask

    # TODO its going to take a little more playing around to find out how to actually invoke the onnx variants. Split results up front.
    # Sometimes its faster to do this in a loop with batches, sometimes not. Unclear what's right.
    def encode(self, text: Tuple[str, ...], **kwargs: Any) -> "torch.Tensor":
        inputs = cast(_TokenizerOutput, self._tokenizer(list(text), padding=True, truncation=True, max_length=512, return_tensors="np"))

        outputs = cast(BaseModelOutput, self._model(**inputs))

        embeddings = self._mean_pooling(outputs.last_hidden_state, inputs["attention_mask"])
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)

        return embeddings
