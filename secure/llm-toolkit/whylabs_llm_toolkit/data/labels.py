from enum import Enum
from typing import List

import numpy as np
import numpy.typing as npt


class Labels(Enum):
    harmful = [1, 0, 0, 0, 0, 0, 0, 0]
    injection = [0, 1, 0, 0, 0, 0, 0, 0]
    code = [0, 0, 1, 0, 0, 0, 0, 0]
    medical = [0, 0, 0, 1, 0, 0, 0, 0]
    financial = [0, 0, 0, 0, 1, 0, 0, 0]
    hate = [0, 0, 0, 0, 0, 1, 0, 0]
    toxic = [0, 0, 0, 0, 0, 0, 1, 0]
    innocuous = [0, 0, 0, 0, 0, 0, 0, 1]
    none = [0, 0, 0, 0, 0, 0, 0, 0]

    @staticmethod
    def labels_to_str(labels: List[int]):
        for label in Labels:
            if label.value == labels:
                return label.name
        return "none"

    @staticmethod
    def get_prediction(label: "Labels", probs: npt.NDArray[np.float64]) -> np.float64:
        if label == Labels.harmful:
            return probs[0]
        elif label == Labels.injection:
            return probs[1]
        elif label == Labels.code:
            return probs[2]
        elif label == Labels.medical:
            return probs[3]
        elif label == Labels.financial:
            return probs[4]
        elif label == Labels.hate:
            return probs[5]
        elif label == Labels.toxic:
            return probs[6]
        elif label == Labels.innocuous:
            return probs[7]
        elif label == Labels.none:
            return np.float64(0)


all_labels = [it.name for it in Labels if it != Labels.none]
