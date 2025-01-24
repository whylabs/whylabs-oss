import json
from typing import Any, Dict, List, Mapping, Optional, Sequence, cast

import chromadb
import click
import pandas as pd
from chromadb.config import Settings

from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets


def _datasets_to_keep(label: Labels) -> Optional[List[Labels]]:
    if label == Labels.injection:
        return [Labels.injection, Labels.innocuous, Labels.code]
    if label == Labels.code:
        return [Labels.code, Labels.medical, Labels.financial]
    if label == Labels.medical:
        return [Labels.medical, Labels.code, Labels.financial]
    if label == Labels.financial:
        return [Labels.financial, Labels.code, Labels.medical]
    if label == Labels.harmful:
        return [Labels.harmful, Labels.innocuous, Labels.code, Labels.financial]
    if label == Labels.hate:
        return [Labels.hate, Labels.innocuous, Labels.code, Labels.financial]
    if label == Labels.toxic:
        return [Labels.toxic, Labels.innocuous, Labels.code, Labels.financial]
    if label == Labels.innocuous:
        return [Labels.innocuous, Labels.injection, Labels.harmful, Labels.hate, Labels.toxic]
    return None


def generate_chroma(name: str, target: SentenceTransformerEncoder, label: Labels) -> None:
    paths = ArtifactPaths(name)
    precomputed_data_csv = paths.get_precomputed_data_path(target, "csv")
    db_path = paths.get_chromadb_path(target, label, twoclass=True)
    client = chromadb.PersistentClient(path=db_path, settings=Settings(anonymized_telemetry=False))

    # Create a collection
    collection = client.create_collection(name="collection", metadata={"hnsw:space": "cosine", "hnsw:search_ef": 100})

    # Read the JSON Lines file
    df = pd.read_csv(precomputed_data_csv)  # pyright: ignore[reportUnknownMemberType]
    df_complete = df
    labels_to_keep = _datasets_to_keep(label)
    if labels_to_keep is not None:
        labels_names = [it.name for it in labels_to_keep]
        df_complete = df_complete[df_complete["dataset"].isin(labels_names)]  # pyright: ignore[reportUnknownMemberType]
    else:
        raise ValueError(f"Unknown label {label}")
    # Convert list fields to strings in the metadata
    df_complete["embeddings"] = df_complete["embeddings"].apply(json.loads)  # pyright: ignore[reportUnknownMemberType]
    df_complete["is_positive"] = df_complete["dataset"].apply(lambda x: 1 if x in [label.name] else 0)  # pyright: ignore[reportUnknownLambdaType, reportUnknownMemberType]
    print(f"Complete data for chroma twoclass generation for label {label.name}:")
    print(df_complete["dataset"].value_counts())
    metadatas = cast(
        List[Mapping[str, Any]],
        df_complete[["uid", "coordinates", "id", "dataset", "label", "is_positive", "source"]].to_dict("records"),  # pyright: ignore[reportUnknownMemberType]
    )
    ids = df_complete["uid"].astype(str).tolist()
    embeddings: List[Sequence[float]] = df_complete["embeddings"].tolist()

    # Add the data to the collection
    # documents set to None, we don't want the raw text in the collection, just the ids
    batch_size = 3000
    num_batches = (len(embeddings) + batch_size - 1) // batch_size
    for batch_index in range(num_batches):
        print(f"Adding batch {batch_index + 1} of {num_batches}")
        start = batch_index * batch_size
        end = min((batch_index + 1) * batch_size, len(embeddings))
        batch_metadatas = metadatas[start:end]
        batch_ids = ids[start:end]
        batch_embeddings = embeddings[start:end]
        collection.add(documents=None, metadatas=batch_metadatas, ids=batch_ids, embeddings=batch_embeddings)  # pyright: ignore[reportUnknownMemberType]

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
