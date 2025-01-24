from functools import cache

from setfit import SetFitModel

from langkit.tensor_util import device


@cache
def load_setfit_model(model_path: str):
    return SetFitModel.from_pretrained(model_path).to(device)  # pyright: ignore[reportUnknownMemberType]
