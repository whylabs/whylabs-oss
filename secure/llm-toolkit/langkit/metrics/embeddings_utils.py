from typing import Union

import numpy as np
import numpy.typing as npt
import torch
import torch.nn.functional as F


def compute_embedding_similarity_encoded(in_encoded: torch.Tensor, out_encoded: torch.Tensor) -> torch.Tensor:
    return F.cosine_similarity(in_encoded, out_encoded, dim=1)


def as_numpy(tensor: Union[torch.Tensor, npt.NDArray[np.float64]]) -> npt.NDArray[np.float64]:
    if isinstance(tensor, torch.Tensor):
        return tensor.cpu().detach().numpy()
    return tensor


def as_pt(tensor: Union[torch.Tensor, npt.NDArray[np.float64]]) -> torch.Tensor:
    if isinstance(tensor, np.ndarray):
        return torch.from_numpy(tensor)  # pyright: ignore[reportUnknownMemberType]
    return tensor
