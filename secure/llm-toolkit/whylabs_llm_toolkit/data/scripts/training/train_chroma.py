import json
from typing import Any, Dict, List, Mapping, Optional, Sequence, cast

import chromadb
import click
import pandas as pd
from chromadb.config import Settings

from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets


def generate_chroma(name: str, target: SentenceTransformerEncoder, label: Labels) -> None:
    paths = ArtifactPaths(name)
    precomputed_data_csv = paths.get_precomputed_data_path(target, "csv")
    db_path = paths.get_chromadb_path(target, label)
    client = chromadb.PersistentClient(path=db_path, settings=Settings(anonymized_telemetry=False))

    # Create a collection
    collection = client.create_collection(name="collection", metadata={"hnsw:space": "cosine", "hnsw:search_ef": 100})

    # Read the JSON Lines file
    df = pd.read_csv(precomputed_data_csv)  # pyright: ignore[reportUnknownMemberType]
    df = df[df["dataset"] == label.name]

    print(f"Filtered to just {label.name} data")
    print(df)

    # Convert list fields to strings in the metadata
    df["embeddings"] = df["embeddings"].apply(json.loads)  # pyright: ignore[reportUnknownMemberType]

    # Prepare the data for insertion
    metadatas = cast(List[Mapping[str, Any]], df[["uid", "coordinates", "id", "dataset", "label"]].to_dict("records"))  # pyright: ignore[reportUnknownMemberType]
    ids = df["uid"].astype(str).tolist()
    embeddings: List[Sequence[float]] = df["embeddings"].tolist()

    # Add the data to the collection
    # documents set to None, we don't want the raw text in the collection, just the ids
    collection.add(documents=None, metadatas=metadatas, ids=ids, embeddings=embeddings)  # pyright: ignore[reportUnknownMemberType]

    # Verify the data has been added
    print(f"Chroamdb {label.name} collection has {collection.count()} documents")


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option("--limit", type=int, required=False, help="An amount to limit the data to, per label", default=None, envvar="LIMIT")
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
def cli(
    name: str,
    limit: Optional[int] = None,
    encoders: Optional[List[str]] = None,
) -> None:
    labels = [Labels.injection, Labels.code, Labels.medical, Labels.financial, Labels.harmful, Labels.hate, Labels.toxic, Labels.innocuous]
    if limit is not None:
        size_filter: Dict[Labels, int] = {label: limit for label in Labels}
    else:
        size_filter: Dict[Labels, int] = {}

    all_data = StandardDataset(size_filter)

    print(all_data)

    for encoder in get_encoder_targets(encoders):
        for label in labels:
            generate_chroma(name, encoder, label)


if __name__ == "__main__":
    cli()
