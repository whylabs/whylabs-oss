import logging
import os
import zipfile
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional, cast

import requests
import whylabs_client
from tenacity import retry, stop_after_attempt, wait_exponential_jitter
from tqdm import tqdm
from whylabs_client import Configuration
from whylabs_client.api.assets_api import AssetsApi
from whylabs_client.model.get_asset_response import GetAssetResponse

from whylabs_llm_toolkit.settings import get_settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_asset_api():
    configuration = Configuration(host=get_settings().WHYLABS_API_ENDPOINT)
    configuration.api_key["ApiKeyAuth"] = get_settings().WHYLABS_API_KEY  # pyright: ignore[reportUnknownMemberType]
    configuration.discard_unknown_keys = True
    client = whylabs_client.ApiClient(configuration)
    return AssetsApi(client)


@retry(stop=stop_after_attempt(5), wait=wait_exponential_jitter(max=5))
def _get_asset(asset_id: str, tag: Optional[str], version: Optional[int], unshared_fallback: Optional[bool] = None) -> GetAssetResponse:
    _unshared_fallback = unshared_fallback or get_settings().UNSHARED_FALLBACK
    try:
        if version is not None:
            return cast(GetAssetResponse, _get_asset_api().get_asset(asset_id, tag=tag, version=version, shared=True))  # pyright: ignore[reportUnknownMemberType]
        else:
            return cast(GetAssetResponse, _get_asset_api().get_asset(asset_id, tag=tag, shared=True))  # pyright: ignore[reportUnknownMemberType]
    except whylabs_client.ApiException as e:
        logger.error(f"Failed to download SHARED asset {asset_id} with tag {tag} and requested version {version}: {e} ")
        # If we don't allow the fallback then just bail now
        if not _unshared_fallback:
            raise e

    logger.info("Trying to download a non shared variant for backwards compatibility before giving up.")
    try:
        if version is not None:
            return cast(GetAssetResponse, _get_asset_api().get_asset(asset_id, tag=tag, version=version))  # pyright: ignore[reportUnknownMemberType]
        else:
            return cast(GetAssetResponse, _get_asset_api().get_asset(asset_id, tag=tag))  # pyright: ignore[reportUnknownMemberType]
    except whylabs_client.ApiException as e:
        logger.error(f"Failed to download asset {asset_id} with tag {tag} and requested version {version}: {e}")
        raise e


@dataclass
class AssetPath:
    asset_id: str
    tag: str
    zip_path: str
    extract_path: str


def _get_asset_path(asset_id: str, tag: str, version: int) -> AssetPath:
    settings = get_settings()
    return AssetPath(
        asset_id=asset_id,
        tag=tag,
        zip_path=f"{settings.WHYLABS_LLM_TOOLKIT_CACHE}/assets/{asset_id}/{tag}/{version}/{asset_id}.zip",
        extract_path=f"{settings.WHYLABS_LLM_TOOLKIT_CACHE}/assets/{asset_id}/{tag}/{version}/{asset_id}",
    )


@dataclass
class CachedAsset:
    asset: AssetPath
    version: int


def _get_cached_asset_path(asset_id: str, tag: str) -> Optional[CachedAsset]:
    """
    Check for any versions cached for the given asset_id and tag and return the latest (highest) one found
    sorted by version number, which is an int.
    """
    settings = get_settings()
    path_to_check = f"{settings.WHYLABS_LLM_TOOLKIT_CACHE}/assets/{asset_id}/{tag}"

    if not os.path.exists(path_to_check):
        logger.info(f"No cached assets found for {asset_id} with tag {tag}")
        return None

    versions = sorted(
        [int(version) for version in os.listdir(path_to_check) if version.isdigit()],
        reverse=True,
    )

    if len(versions) == 0:
        logger.info(f"No cached assets found for {asset_id} with tag {tag}")
        return None

    version = versions[0]

    cached_asset = CachedAsset(
        asset=_get_asset_path(asset_id, tag, version),
        version=version,
    )

    # If there is a maybe-zip file there and it isn't a valid zip the bail
    if os.path.exists(cached_asset.asset.zip_path) and not _is_zip_file(cached_asset.asset.zip_path):
        return None

    # Check the rest of the dir to see if the zip is there, if its alreayd extracted, etc.
    if not _is_extracted(asset_id, tag, version):
        logger.info(f"Found cached asset {asset_id} with tag {tag}, version {version} but it's corrupted, re-downloading")
        return None

    return cached_asset


def _is_extracted(asset_id: str, tag: str, version: int) -> bool:
    asset_path = _get_asset_path(asset_id, tag, version)

    # If we can see the metadata file, we assume the asset is extracted
    metadata_file_content = _read_asset_metadata(asset_id, tag, version)
    if metadata_file_content is not None:
        logger.info(f"Asset {asset_id} with tag {tag}, version {version} already extracted")
        # check that each file in the metadata file exists
        for file_name in metadata_file_content:
            if not os.path.exists(f"{asset_path.extract_path}/{file_name}"):
                logger.info(f"Asset {asset_id} with tag {tag}, version {version} not extracted, file {file_name} missing but expected")
                return False
        return True

    if not os.path.exists(asset_path.zip_path):
        logger.info(f"Asset {asset_id} with tag {tag}, version {version} not downloaded, zip file not found")
        return False

    # If the zip file is still here then check if it's been extracted
    with zipfile.ZipFile(asset_path.zip_path, "r") as zip_ref:
        zip_names = set(zip_ref.namelist())
        extract_names = set(os.listdir(asset_path.extract_path))

    return zip_names.issubset(extract_names)


def _extract_asset(asset_id: str, tag: str, version: int):
    asset_path = _get_asset_path(asset_id, tag, version)
    with zipfile.ZipFile(asset_path.zip_path, "r") as zip_ref:
        zip_ref.extractall(asset_path.extract_path)


_metadata_file_name = "zip_manifest.txt"


def _generate_asset_metadata(asset_id: str, tag: str, version: int):
    """
    Create a metadata file with a list of all of the expected files in the asset zip
    """
    asset_path = _get_asset_path(asset_id, tag, version)
    with zipfile.ZipFile(asset_path.zip_path, "r") as zip_ref:
        with open(f"{asset_path.extract_path}/{_metadata_file_name}", "w") as f:
            f.write("\n".join(zip_ref.namelist()))


def _read_asset_metadata(asset_id: str, tag: str, version: int) -> Optional[List[str]]:
    asset_path = _get_asset_path(asset_id, tag, version)
    if not os.path.exists(f"{asset_path.extract_path}/{_metadata_file_name}"):
        return None

    with open(f"{asset_path.extract_path}/{_metadata_file_name}", "r") as f:
        return f.read().split("\n")


def _is_zip_file(file_path: str) -> bool:
    if not os.path.exists(file_path):
        return False

    try:
        with zipfile.ZipFile(file_path, "r"):
            return True
    except zipfile.BadZipFile:
        return False


def _remove_zip_file(asset_id: str, tag: str, version: int):
    asset_path = _get_asset_path(asset_id, tag, version)
    os.remove(asset_path.zip_path)


def _download_asset(asset_id: str, tag: str, version: int):
    try:
        response: GetAssetResponse = _get_asset(asset_id, tag, version)
    except whylabs_client.ApiException as e:
        raise ValueError(f"Failed to download asset {asset_id} with tag {tag} and requested version {version}: {e}")
    asset_path = _get_asset_path(asset_id, tag, version)
    url = cast(str, response.download_url)
    os.makedirs(os.path.dirname(asset_path.zip_path), exist_ok=True)
    r = requests.get(url, stream=True)
    logger.info(f"Writing asset to {asset_path.zip_path}")
    with open(asset_path.zip_path, "wb") as f:
        desc = f"Download: {asset_id}, {tag}: {version}"
        for chunk in tqdm(r.iter_content(chunk_size=1024), desc=desc, total=int(r.headers.get("content-length", 0)) // 1024):
            f.write(chunk)

    if not _is_zip_file(asset_path.zip_path):
        os.remove(asset_path.zip_path)
        raise ValueError(f"Downloaded file {asset_path.zip_path} is not a zip file")


def get_asset(asset_id: str, tag: str, version: Optional[int] = None) -> str:
    force_download = get_settings().WHYLABS_LLM_TOOLKIT_FORCE_DOWNLOAD.lower() == "true"
    logger.debug("Force download is set to %s", force_download)

    if version is None:
        # If there is no version specified, check if we have any cached version
        cached_asset = _get_cached_asset_path(asset_id, tag)
        if cached_asset is not None and not force_download:
            logger.info(f"Found cached asset {asset_id} with tag {tag}, version {cached_asset.version}")
            return cached_asset.asset.extract_path
        else:
            # otherwise, fetch the latest version
            logger.info(f"Fetching the latest version of asset {asset_id} with tag {tag}")
            try:
                response = _get_asset(asset_id, tag, version)
                version = cast(int, response.version)  # pyright: ignore[reportUnknownMemberType]

            except whylabs_client.ApiException as e:
                raise ValueError(f"Failed to download asset {asset_id} with tag {tag} and requested version {version}: {e}")

    asset_path = _get_asset_path(asset_id, tag, version)

    if os.path.exists(asset_path.zip_path) and not _is_zip_file(asset_path.zip_path):
        # We might have a corrupted zip file, remove it and re-download
        logger.error(f"Corrupted zip file found at {asset_path.zip_path}, re-downloading")
        os.remove(asset_path.zip_path)

    if _is_extracted(asset_id, tag, version) and not force_download:
        logger.info(f"Asset {asset_id} with tag {tag}, version {version} already downloaded and extracted")
        return asset_path.extract_path

    if not os.path.exists(asset_path.zip_path) or force_download:
        if force_download:
            logger.info(f"Force downloading asset {asset_id} with tag {tag}, version {version}")
        logger.info(f"Downloading asset {asset_id} with tag {tag}, version {version} to {asset_path.zip_path}")
        _download_asset(asset_id, tag, version)

    logger.info(f"Extracting asset {asset_id} with tag {tag}")

    _extract_asset(asset_id, tag, version)
    _generate_asset_metadata(asset_id, tag, version)
    _remove_zip_file(asset_id, tag, version)

    return asset_path.extract_path
