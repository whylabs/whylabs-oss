import glob
import os
import re
from typing import List, Optional

import click
import huggingface_hub
import pandas as pd
from datasets import Dataset, DatasetDict

import whylabs_llm_toolkit
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets
from whylabs_llm_toolkit.settings import reload_settings


def get_csv_files(folder: str):
    return glob.glob(os.path.join(folder, "**", "*.csv"), recursive=True)


def read_csv(file_path: str) -> pd.DataFrame:
    return pd.read_csv(file_path)  # pyright: ignore[reportUnknownMemberType]


def sanitize_split_name(name: str):
    # Replace path separators with a unique separator
    sep_replace_name: str = name.replace(os.path.sep, "__")
    sanitized_name = sep_replace_name.replace("-", "_HYPHEN_")
    # Ensure it doesn't start with a number
    if re.match(r"^\d", sanitized_name):
        sanitized_name = f"split_{sanitized_name}"
    return sanitized_name


def preprocess_df(df: pd.DataFrame):
    common_schema = {
        "dataset": str,
        "text": str,
        "source": str,
        "label": str,
        "uid": str,
        "embeddings": str,
        "coordinates": str,
        "id": str,
    }

    # Create a dataset from the DataFrame
    if df.empty:
        df = pd.DataFrame(columns=list(common_schema.keys()))
        # add single row with 'empty' to all columns
        df.loc[0] = "empty"
        df.reset_index(drop=True, inplace=True)

    # Ensure all columns are present and have the correct type
    for col, dtype in common_schema.items():
        if col not in df.columns:
            df[col] = ""  # Add missing columns with empty strings
        df[col] = df[col].astype(dtype)
    df = df[common_schema.keys()]

    return df


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option(
    "--hf_push",
    type=str,
    required=False,
    help="Whether to push data to Hugging Face private dataset. Currently used for data curation HF space, vector-db-playground.",
    envvar="HF_PUSH",
)
@click.option(
    "--hf_token",
    type=str,
    required=False,
    help="Hugging Face token for authentication.",
    envvar="HUGGINGFACE_TOKEN",
)
@click.option(
    "-e",
    "--encoders",
    type=str,
    required=False,
    multiple=True,
    help=f"""
Which sentence transformers to use, from: {str(list([it.name for it in SentenceTransformerEncoder.__members__.values()]))}
""",
    envvar="ENCODERS",
)
def cli(name: str, encoders: Optional[List[str]] = None, hf_push: str = "false", hf_token: Optional[str] = None):
    """
    Runs comparison tables to evaluate WhyLabs metrics with other competitors.
    """
    if hf_push != "true":
        print("Skipping upload to Hugging Face")
        return
    if not hf_token:
        raise ValueError("Hugging Face token is required for data upload.")
    huggingface_hub.login(token=os.getenv("HUGGINGFACE_TOKEN"))

    reload_settings()
    root_folder = "data"

    paths = ArtifactPaths(name)
    st = get_encoder_targets(encoders)[0]
    csv_path = paths.get_precomputed_data_path(st, "csv")

    assert st.name == "AllMiniLML6V2"
    csv_files = get_csv_files(root_folder)
    all_datasets = {}
    precomputed_data = pd.read_csv(csv_path)  # pyright: ignore[reportUnknownMemberType]
    precomputed_data = preprocess_df(precomputed_data)
    all_datasets[f"{st.name}_precompute"] = Dataset.from_pandas(precomputed_data)
    for file in csv_files:
        print("Reading file:", file)
        # Get the relative path from the root folder
        relative_path = os.path.relpath(file, root_folder)
        # Use the relative path (without .csv extension) as the key
        key = os.path.splitext(relative_path)[0]
        sanitized_key = sanitize_split_name(key)

        # Read the CSV file
        df = read_csv(file)
        df = preprocess_df(df)
        all_datasets[sanitized_key] = Dataset.from_pandas(df)

    dataset_dict = DatasetDict(all_datasets)
    print(dataset_dict)
    dataset_dict.push_to_hub("whylabs/dataset-curations", revision=str(whylabs_llm_toolkit.__version__))  # pyright: ignore[reportUnknownMemberType]


if __name__ == "__main__":
    cli()
