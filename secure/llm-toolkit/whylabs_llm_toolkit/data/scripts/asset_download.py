from typing import Optional

import click

from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.scripts.targets import AssetStage, SentenceTransformerEncoder


def download(asset_id: str, stage: AssetStage, encoder: SentenceTransformerEncoder, version: Optional[int]):
    get_asset(asset_id, f"{stage}_{encoder.value.name}", version)


@click.command()
@click.option("--asset-id", type=str, required=True)
@click.option("--stage", type=str, required=True)
@click.option("--encoder", type=str, required=True)
@click.option("--version", type=Optional[int], required=False)
def cli(asset_id: str, stage: AssetStage, encoder: str, version: Optional[int]):
    encoder_name = SentenceTransformerEncoder.from_string(encoder)
    download(asset_id, stage, encoder_name, version)


if __name__ == "__main__":
    cli()
