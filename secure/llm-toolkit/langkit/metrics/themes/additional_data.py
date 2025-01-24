import io
from dataclasses import dataclass
from functools import cache
from typing import Union

import numpy as np
import numpy.typing as npt
import pandas as pd
import requests


@dataclass(frozen=True)
class S3Path:
    bucket: str
    key: str


def parse_s3_path(s3_path: str) -> S3Path:
    if not s3_path.startswith("s3://"):
        raise ValueError("Not an S3 path")
    s3_path = s3_path[len("s3://") :]
    bucket, key = s3_path.split("/", 1)
    return S3Path(bucket, key)


@dataclass(frozen=True)
class AdditionalData:
    additional_data_path: str

    def encode_additional_data(self) -> Union[pd.DataFrame, npt.NDArray[np.float64]]:
        return _load_additional_data(self)


def _parse_parquet(additional_data_path: Union[str, io.BytesIO]) -> pd.DataFrame:
    df = pd.read_parquet(additional_data_path)

    if "id" not in df.columns or "embedding" not in df.columns:
        raise ValueError("Parquet file must have id and embedding columns.")

    # Defensively convert the embedding column to a list of floats in case they're numpy
    df["embedding"] = df["embedding"].apply(lambda x: [float(val) for val in x])  # pyright: ignore[reportUnknownMemberType,reportUnknownLambdaType, reportUnknownArgumentType, reportUnknownVariableType]
    return df


@cache
def _load_additional_data(additional_data: AdditionalData) -> Union[pd.DataFrame, npt.NDArray[np.float64]]:
    if additional_data.additional_data_path.startswith("http"):
        response = requests.get(additional_data.additional_data_path)
        response.raise_for_status()
        return np.load(io.BytesIO(response.content))
    elif additional_data.additional_data_path.startswith("s3://"):
        try:
            import boto3  # pyright: ignore[reportMissingImports]
        except ImportError:
            raise ImportError("To use S3 paths, install the boto3 package.")

        s3_path = parse_s3_path(additional_data.additional_data_path)
        s3 = boto3.client("s3")  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
        obj = s3.get_object(Bucket=s3_path.bucket, Key=s3_path.key)  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]

        if additional_data.additional_data_path.endswith(".parquet"):
            return _parse_parquet(io.BytesIO(obj["Body"].read()))  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
        elif additional_data.additional_data_path.endswith(".npy"):
            return np.load(io.BytesIO(obj["Body"].read()))  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
        else:
            raise ValueError(
                "Unsupported additional data format. Use a .npy with " "embeddings file or a .parquet file with id,embedding columns."
            )

    elif ".npy" in additional_data.additional_data_path:
        # .npy files are assumed to be only embeddings. You can't have mixed string/floats in a .npy file
        # so you can't specfy the ids in the same file.
        return np.load(additional_data.additional_data_path)
    elif ".parquet" in additional_data.additional_data_path:
        return _parse_parquet(additional_data.additional_data_path)
    else:
        raise ValueError("Unsupported additional data format. Use a .npy file from numpy.")
