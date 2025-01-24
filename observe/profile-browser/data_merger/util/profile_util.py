from datetime import datetime, timezone
from typing import Any, Union

import fsspec
from whylogs import DatasetProfileView
from whylogs.migration.converters import (
    DatasetProfileMessageV0,
    DeserializationError,
    read_delimited_protobuf,
    read_v0_to_view,
    v0_to_v1_view,
)


def read_profile(path: str, allow_partial: bool = True) -> DatasetProfileView:
    try:
        return _read_v1_profile(path, allow_partial)
    except Exception:
        return _read_v0_to_view_compressed(path, allow_partial)


def _read_v1_profile(path: str, allow_partial: bool = True) -> DatasetProfileView:
    return DatasetProfileView.read(path)


def _read_v0_to_view_compressed(path: str, allow_partial: bool = True) -> DatasetProfileView:
    if "tgz" in path or "tar.gz" in path or "gz" in path:
        with fsspec.open(path, compression="gzip") as f:
            v0_msg = read_delimited_protobuf(f, DatasetProfileMessageV0)  # pyright: ignore[reportArgumentType]
            if v0_msg is None:
                raise DeserializationError("Unexpected empty message")
            return v0_to_v1_view(v0_msg, allow_partial)
    else:
        return read_v0_to_view(path, allow_partial)


def parse_date(it: Union[int, str, Any]) -> datetime:
    """
    Convert either a ms epoch int or a string utc date into a datetime object with a UTZ timezone

    Parameters:
    -----------
    it : Union[int, str, Any]
        The date to parse. Should be an int or a string but Any is allowed to make types from pandas work out.
    """
    if isinstance(it, int):
        return datetime.fromtimestamp(it / 1000.0, tz=timezone.utc)
    elif isinstance(it, str):
        return datetime.fromisoformat(it.replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
    else:
        raise ValueError(f"Unsupported type for date parsing: {type(it)}")
