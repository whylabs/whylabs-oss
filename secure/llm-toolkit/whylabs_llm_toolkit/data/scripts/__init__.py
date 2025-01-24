import random

import numpy as np
import torch

GLOBAL_SEED = 42

random.seed(0)
np.random.seed(0)

torch.manual_seed(GLOBAL_SEED)  # pyright: ignore[reportUnknownMemberType]
# https://pytorch.org/docs/stable/notes/randomness.html#cuda-convolution-benchmarking
# This also requires setting CUBLAS_WORKSPACE_CONFIG=:4096:8 outside of the script, in our makefile
torch.backends.cudnn.benchmark = False
# https://pytorch.org/docs/stable/notes/randomness.html#cuda-convolution-determinism
torch.backends.cudnn.deterministic = True
# https://pytorch.org/docs/stable/notes/randomness.html#avoiding-nondeterministic-algorithms
torch.use_deterministic_algorithms(True)
