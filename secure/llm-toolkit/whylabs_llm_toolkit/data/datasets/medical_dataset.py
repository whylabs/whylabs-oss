# pyright: reportUnknownMemberType=none, reportIndexIssue=none
from typing import Dict, Optional, cast

import pandas as pd
from datasets import (
    DatasetDict,
    load_dataset,  # pyright: ignore[reportUnknownVariableType]
)
from textstat import textstat

from langkit.core.workflow import Workflow
from langkit.metrics.input_output_similarity import input_output_similarity_metric
from whylabs_llm_toolkit.data.data import Data, DataGroup, download_data
from whylabs_llm_toolkit.data.datasets.data_process import common_process
from whylabs_llm_toolkit.data.datasets.paths import data_path
from whylabs_llm_toolkit.data.labels import Labels

_data_path = f"{data_path()}/topic/medical"


def filter_low_relevance(df: pd.DataFrame, input_col: str, output_col: str, threshold=0.2) -> pd.DataFrame:
    wf_df = pd.DataFrame(
        {
            "prompt": df[input_col].tolist(),
            "response": df[output_col].tolist(),
        }
    )

    wf = Workflow(metrics=[input_output_similarity_metric])

    actual = wf.run(wf_df)
    df["similarity"] = actual.metrics["response.similarity.prompt"].tolist()
    # drop rows with low relevance
    df = df[df["similarity"] > threshold]
    return df


class MedicalMeadowWikiDocDataset(Data):
    _ds_name = "medalpaca/medical_meadow_wikidoc"
    _file_name = _ds_name.replace("/", "_")

    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(MedicalMeadowWikiDocDataset._ds_name, revision="976bce16fd66f55e6828422b71249a7405a11aa4"))

        # has 112k rows
        complete = data["train"].to_pandas()
        complete = complete[~complete["input"].str.contains("rephrase", case=False)]  # pyright: ignore[reportUnknownVariableType]
        complete = complete[~complete["input"].str.contains("provide", case=False)]  # pyright: ignore[reportUnknownVariableType]
        complete = complete[~complete["input"].str.contains("context", case=False)]  # pyright: ignore[reportUnknownVariableType]
        complete = complete[complete["input"].apply(lambda x: len(x) > 25)]  # pyright: ignore[reportUnknownVariableType, reportUnknownLambdaType, reportUnknownArgumentType]
        complete = filter_low_relevance(complete, input_col="input", output_col="output", threshold=0.2)  # pyright: ignore[reportUnknownArgumentType]
        complete = common_process(complete, label=Labels.medical, source=MedicalMeadowWikiDocDataset._ds_name, rename={"input": "text"})
        complete = complete.sample(frac=1, random_state=42).reset_index(drop=True)
        eval = complete[0:1000]
        test = complete[1000:2000]
        train = pd.DataFrame(columns=["text", "label", "dataset", "source", "uid"])

        print(train.shape, eval.shape, test.shape)
        self._write_data(train=train, test=test, eval=eval)

    def get_data_subdir(self) -> str:
        return f"{_data_path}/{MedicalMeadowWikiDocDataset._file_name}"

    def get_file_prefix(self) -> str:
        return MedicalMeadowWikiDocDataset._file_name


class MedicalQuestionsDataset(Data):
    _ds_name = "Malikeh1375/medical-question-answering-datasets"
    _file_name = _ds_name.replace("/", "_")

    def load(self) -> None:
        data = cast(
            DatasetDict,
            load_dataset(MedicalQuestionsDataset._ds_name, revision="4d69c9f6874bc5ec8be3817e9d86b7333a8a5070", name="all-processed"),
        )

        # has 247k rows
        train = data["train"].to_pandas()

        train = common_process(train, label=Labels.medical, source=MedicalQuestionsDataset._ds_name, rename={"input": "text"})
        # filter out rows with a single word. This dataset has a lot of "hello" and "hi" stuff
        train = train[train["text"].apply(lambda x: textstat.lexicon_count(x, removepunct=True) > 1)]  # pyright: ignore[reportUnknownLambdaType,reportUnknownArgumentType]

        self._write_data(train=train[0:5000], test=train[-1000:], eval=train[-2000:-1000])

    def get_data_subdir(self) -> str:
        return f"{_data_path}/medical_questions"

    def get_file_prefix(self) -> str:
        return MedicalQuestionsDataset._file_name


class MedicalChatBotDataset(Data):
    _ds_name = "lavita/ChatDoctor-HealthCareMagic-100k"
    _file_name = _ds_name.replace("/", "_")

    def load(self) -> None:
        data = cast(DatasetDict, load_dataset(MedicalChatBotDataset._ds_name, revision="505443eac4e99ccedeffbb6f640061223d1d4bb3"))

        # has 112k rows
        train = data["train"].to_pandas()

        train = common_process(train, label=Labels.medical, source=MedicalChatBotDataset._ds_name, rename={"input": "text"})
        # filter out rows with a single word. This dataset has a lot of "hello" and "hi" stuff
        train = train[train["text"].apply(lambda x: textstat.lexicon_count(x, removepunct=True) > 1)]  # pyright: ignore[reportUnknownLambdaType,reportUnknownArgumentType]

        self._write_data(train=train[0:5000], test=train[-1000:], eval=train[-2000:-1000])

    def get_data_subdir(self) -> str:
        return f"{_data_path}/medical_chat_bot"

    def get_file_prefix(self) -> str:
        return MedicalChatBotDataset._file_name


class MedicalDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__([MedicalQuestionsDataset(), MedicalChatBotDataset()], size_filter=size_filter)


if __name__ == "__main__":
    download_data(MedicalDataset())
    data = MedicalDataset().get_data("train")
