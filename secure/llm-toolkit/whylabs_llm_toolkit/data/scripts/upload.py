import json
import logging
import os
import time
import zipfile
from dataclasses import asdict, dataclass, field
from typing import Any, List, Optional, Tuple, cast

import requests
import songbird_client
from mlflow.utils.doctor import click
from songbird_client import Configuration
from songbird_client.api.assets_api import AssetsApi
from songbird_client.model.upload_asset_request import UploadAssetRequest
from songbird_client.model.upload_asset_response import UploadAssetResponse
from tqdm import tqdm
from tqdm.utils import CallbackIOWrapper

from whylabs_llm_toolkit.data import init_ci_logging
from whylabs_llm_toolkit.data.labels import Labels, all_labels
from whylabs_llm_toolkit.data.scripts.targets import (
    ArtifactPaths,
    Asset,
    AssetId,
    AssetStage,
    SentenceTransformerEncoder,
    asset_metadata_path,
    get_encoder_targets,
)
from whylabs_llm_toolkit.data.scripts.upload_aws_auth import get_aws_auth_value
from whylabs_llm_toolkit.settings import get_settings
from whylabs_llm_toolkit.version import __version__

_logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UploadUrlInfo:
    url: str
    version: int


@dataclass
class ToUpload:
    zip_dir_path: str
    """
    The path to use to create the zip file
    """

    asset_id: AssetId
    """
    The asset id in the songbird api
    """


@dataclass(frozen=True)
class UploadSuccess:
    asset_id: str
    tag: str
    version: int


@dataclass(frozen=True)
class UploadMetadata:
    encoder: str
    encoder_revision: str
    sha: str
    asset_version: int
    data_tag: str
    data_version: int
    labels: List[str]
    toolkit_version: str = __version__
    create_time_ms: int = field(default_factory=lambda: int(time.time() * 1000))
    data_major_version: int = 0
    """
    We use this to indicate breaking changes in the organization of the data. We have to manually update this
    when we know we do a large change that would result in dramatically different PCA output, like add new labels.
    """


def _get_asset_api():
    configuration = Configuration(host=get_settings().WHYLABS_API_ENDPOINT)
    configuration.api_key["ApiKeyAuth"] = get_aws_auth_value()  # pyright: ignore[reportUnknownMemberType]
    configuration.discard_unknown_keys = True
    client = songbird_client.ApiClient(configuration)
    return AssetsApi(client)


def get_upload_asset_url(asset_id: str, tag: str, file_path: str) -> UploadUrlInfo:
    upload_request = cast(UploadAssetRequest, UploadAssetRequest(file_name=file_path, tag=tag))
    try:
        response = cast(UploadAssetResponse, _get_asset_api().upload_shared_asset(asset_id, tag, upload_request))  # pyright: ignore[reportUnknownMemberType]
    except songbird_client.ApiException as e:
        raise ValueError(f"Failed to get upload url for {asset_id} with tag {tag}: {e}")
    return UploadUrlInfo(response["upload_url"], response["version"])


def upload_asset(upload_info: UploadUrlInfo, asset_id: str, tag: str, file_path: str):
    file_size = os.path.getsize(file_path)
    progress = tqdm(total=file_size, unit="B", unit_scale=True, desc="Uploading")

    _logger.info(f"Uploading asset {asset_id} with tag {tag} and version {upload_info.version}, size {file_size} bytes")

    with open(file_path, "rb") as f:
        wrapped_file = cast(Any, CallbackIOWrapper(progress.update, f))
        response = requests.put(upload_info.url, data=wrapped_file, timeout=None)

    progress.close()
    if response.status_code == 200:
        _logger.info(f"Uploaded asset {asset_id} with tag {tag} and version {upload_info.version}")
    else:
        raise ValueError(f"Failed to upload asset {asset_id} with tag {tag}: {response.text}")


def create_zip(dir_or_file: str, metadata: UploadMetadata) -> str:
    zip_file = os.path.normpath(dir_or_file) + ".zip"
    _logger.info(f"Zipping {dir_or_file} to {zip_file}")
    with zipfile.ZipFile(zip_file, "w") as z:
        if os.path.isfile(dir_or_file):
            z.write(dir_or_file, os.path.basename(dir_or_file))
            z.writestr(asset_metadata_path, json.dumps(asdict(metadata)))
        else:
            for root, _, files in os.walk(dir_or_file):
                for file in files:
                    _logger.info(f"Adding {os.path.join(root, file)}")
                    z.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), dir_or_file))
            z.writestr(asset_metadata_path, json.dumps(asdict(metadata)))
    return zip_file


def _upload(
    upload: ToUpload,
    zip_files: List[Tuple[ToUpload, str, SentenceTransformerEncoder, UploadUrlInfo]],
    sha: str,
    encoder: SentenceTransformerEncoder,
    stage: AssetStage,
    data_version: Optional[int] = None,
) -> int:
    asset = Asset(encoder, stage, upload.asset_id)
    upload_info = get_upload_asset_url(upload.asset_id, tag=asset.tag_name(), file_path=upload.zip_dir_path)
    metadata = UploadMetadata(
        sha=sha,
        encoder=encoder.value.name,
        encoder_revision=encoder.value.revision,
        asset_version=upload_info.version,
        data_tag=asset.tag_name(),
        data_version=data_version or upload_info.version,
        labels=all_labels,
    )

    # if this exists then create a flat zip file with the dir content
    if os.path.exists(upload.zip_dir_path):
        zip_file = create_zip(upload.zip_dir_path, metadata)
        zip_files.append((upload, zip_file, encoder, upload_info))

    return upload_info.version


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option(
    "-s",
    "--stage",
    type=click.Choice(["dev", "prod", "local", "local_anthony", "local_felipe", "demo", "local_christine"]),
    required=True,
    help="The stage: prod, local, dev",
    envvar="STAGE",
)
@click.option("--sha", type=str, required=True, help="The git sha of the current build", envvar="SHA")
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
def cli(name: str, stage: AssetStage, sha: str, encoders: Optional[List[str]] = None) -> None:
    zip_files: List[Tuple[ToUpload, str, SentenceTransformerEncoder, UploadUrlInfo]] = []
    for encoder in get_encoder_targets(encoders):
        paths = ArtifactPaths(name)

        # Data is a special case, we need to upload it first so we can use the version in the other upload metadata
        data_upload = ToUpload(paths.get_snapshot_data_path(encoder, "json"), "data")
        data_version = _upload(data_upload, zip_files, sha, encoder, stage)

        uploads = [
            ToUpload(paths.get_classifier_model_path(encoder), "setfit_classifier"),
            ToUpload(paths.get_eval_results_path(encoder), "eval"),
            ToUpload(paths.get_pca_coordinate_path(encoder), "pca"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.injection, twoclass=True), "chromadb_twoclass"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.code, twoclass=True), "chromadb_twoclass_code"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.medical, twoclass=True), "chromadb_twoclass_medical"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.financial, twoclass=True), "chromadb_twoclass_financial"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.toxic, twoclass=True), "chromadb_twoclass_toxic"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.hate, twoclass=True), "chromadb_twoclass_hate"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.harmful, twoclass=True), "chromadb_twoclass_harmful"),
            ToUpload(paths.get_chromadb_path(encoder, Labels.innocuous, twoclass=True), "chromadb_twoclass_innocuous"),
        ]

        for upload in uploads:
            _upload(upload, zip_files, sha, encoder, stage, data_version)

    success: List[UploadSuccess] = []
    for upload, zip_file, encoder, upload_info in zip_files:
        asset = Asset(encoder, stage, upload.asset_id)
        upload_asset(upload_info, upload.asset_id, tag=asset.tag_name(), file_path=zip_file)

        success.append(UploadSuccess(upload.asset_id, asset.tag_name(), upload_info.version))

    _logger.info(f"Successfully uploaded {len(success)} assets")
    for s in success:
        _logger.info(f"    Asset {s.asset_id} with tag {s.tag} and version {s.version}")

    # Also write the success list to ./upload_manifest.json
    with open("upload_manifest.json", "w") as f:
        json.dump([asdict(s) for s in success], f)


if __name__ == "__main__":
    init_ci_logging()
    cli()
