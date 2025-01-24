# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import Dict, Iterator, List, Optional, Union

import pandas as pd

from langkit.core.workflow import Workflow, WorkflowResult
from whylabs_llm_toolkit.data.data import required_columns
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.steps.id_step import id_step
from whylabs_llm_toolkit.data.steps.id_validator import IdValidator


def _categorize_oai_data(complete_row: pd.Series) -> str:  # pyright: ignore[reportUnknownParameterType, reportMissingTypeArgument]
    row = complete_row.drop(["prompt", "category"], errors="ignore")  # pyright: ignore[reportUnknownVariableType]
    sanitized_row = row.dropna()  # pyright: ignore[reportUnknownVariableType]

    labels: List[float] = sanitized_row.tolist()
    if not sum(labels) >= 1:
        return "negative"
    toxic_columns = ["S", "HR", "SH", "S3"]
    toxic_sum = sum(sanitized_row.get(col, 0) for col in toxic_columns if col in sanitized_row.index)  # pyright: ignore[reportUnknownArgumentType]
    if toxic_sum >= 1:
        return "toxic"
    hate_columns = ["H", "H2"]
    hate_sum = sum(sanitized_row.get(col, 0) for col in hate_columns if col in sanitized_row.index)  # pyright: ignore[reportUnknownArgumentType]
    if hate_sum >= 1:
        return "hate"
    hate_columns = ["V", "V2"]
    hate_sum = sum(sanitized_row.get(col, 0) for col in hate_columns if col in sanitized_row.index)  # pyright: ignore[reportUnknownArgumentType]
    if hate_sum >= 1:
        return "violence"

    return "unknown"


def process_oai_moderation_data(
    df: pd.DataFrame,
) -> pd.DataFrame:
    df["category"] = df.apply(_categorize_oai_data, axis=1)  # pyright: ignore[reportUnknownArgumentType]
    return df


def generate_uids(data: pd.DataFrame) -> WorkflowResult:
    wf = Workflow(metrics=[id_step], validators=[IdValidator()])
    result = wf.run(data)
    result.metrics.reset_index(drop=True, inplace=True)
    data.reset_index(drop=True, inplace=True)
    return result


def common_process(
    df: Union[pd.DataFrame, Iterator[pd.DataFrame]],
    label: Optional[Labels],
    source: str,
    filter_by: Dict[str, Union[str, int]] = {},
    rename: Dict[str, str] = {},
) -> pd.DataFrame:
    if not isinstance(df, pd.DataFrame):
        # Types make it annoying when using the datasets library. They don't actually return an iterator
        # the way we use them but we take it in to aovid having to always cast.
        raise ValueError("Need to pass a dataframe instead of an iterator")

    if rename:
        df = df.rename(columns=rename)

    df = df[df["text"].apply(lambda x: isinstance(x, str))]  # pyright: ignore[reportUnknownLambdaType]
    df = df[df["text"].apply(lambda x: len(x) > 0)]  # pyright: ignore[reportUnknownLambdaType,reportUnknownArgumentType]
    df = df.drop_duplicates(subset=["text"], keep="first")

    # TODO add duplicate dropping based on embedding similarity

    for key, value in filter_by.items():
        df = df[df[key] == value]

    df["source"] = source

    if label is not None:
        df["dataset"] = label.name
        df["label"] = [label.value] * len(df)
    else:
        # if no label then validate that there is a dataset column with valid values
        assert "dataset" in df.columns
        # The stroing label should be one of the enum cases of Label
        # For each row, set the label to the value of the dataset column
        df["label"] = df["dataset"].apply(lambda x: Labels[x].value)  # pyright: ignore[reportUnknownLambdaType]

    result = generate_uids(df)
    df = pd.concat([result.metrics, df], axis=1)

    df = df[required_columns]  # Only retain the required columns
    return df
