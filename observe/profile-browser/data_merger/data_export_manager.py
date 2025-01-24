import hashlib
import logging
import os
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Generator, List, Optional, Tuple, cast

import boto3
import pandas as pd
from tqdm import tqdm
from whylogs import DatasetProfileView

from data_merger.logging_setup import setup
from data_merger.util.graphs import plot_time_series_df
from data_merger.util.profile_util import parse_date, read_profile

_logger = logging.getLogger(__name__)

_metadata_file_name = "metadata.csv"

setup()


class ProfileDownloadStatus(Enum):
    PREVIOUSLY_DOWNLOADED = 0
    SUCCESS = 1
    MISSING = 2
    FAILED = 3


@dataclass
class ProfileDownloadResult:
    profile: str
    status: ProfileDownloadStatus


@dataclass
class DataExportManager:
    bucket: str
    prefix: Optional[str] = None
    local_path: Optional[str] = None
    download_dir: str = ".whylabs_profiles"
    ignore_missing_profiles: bool = True  # TODO this is just a temporary dev flag. There should be no missing profiles.

    _metadata: Optional[pd.DataFrame] = None

    def _get_local_path(self) -> str:
        if self.local_path is None:
            return f"{self.download_dir}/{self.bucket}/{self.prefix}"

        return f"{self.download_dir}/{self.local_path}"

    def _get_local_metadata_path(self) -> str:
        return f"{self._get_local_path()}/{_metadata_file_name}"

    def _get_metadata_hash(self) -> str:
        """
        Get a sha checksum for the metadata file content
        """
        self.load_metadata()
        sha = hashlib.sha256()
        path = self._get_local_metadata_path()
        with open(path, "rb") as f:
            sha.update(f.read())
        return sha.hexdigest()

    def _add_prefix(self, key: str) -> str:
        if self.prefix is None:
            return key

        return f"{self.prefix}/{key}"

    def download_metadata(self) -> None:
        os.makedirs(self._get_local_path(), exist_ok=True)

        local_file = self._get_local_metadata_path()

        s3_client = boto3.client("s3")

        key_compressed = self._add_prefix(f"{_metadata_file_name}.gz")
        try:
            _logger.info(f"Downloading metadata from {self.bucket}/{key_compressed} to {local_file}")
            s3_client.download_file(self.bucket, key_compressed, local_file)
            # also uncompress it
            with open(local_file, "rb") as f:
                content = f.read()
                with open(local_file.replace(".gz", ""), "wb") as f:
                    f.write(content)
        except Exception as e:
            _logger.error(f"Failed to download {self.bucket}/{key_compressed}: {e}. Looking for one without compression.")

            key_uncompressed = self._add_prefix(_metadata_file_name)
            try:
                s3_client.download_file(self.bucket, key_uncompressed, local_file)
            except Exception as e:
                _logger.error(f"Failed to download {self.bucket}/{key_uncompressed }: {e}")
                raise e

    def load_metadata(self, force_update: bool = False) -> pd.DataFrame:
        # If its already cached in self._metadata then return that
        if self._metadata is not None and not force_update:
            return self._metadata

        if not os.path.exists(self._get_local_metadata_path()):
            self.download_metadata()

        # Load the file into pandas and return
        self._metadata = pd.read_csv(self._get_local_metadata_path())
        return self._metadata

    def list_orgs(self, force_update: bool = False) -> pd.DataFrame:
        df = self.load_metadata(force_update=force_update)
        return df["org_id"].drop_duplicates().to_frame()

    def list_models(self, force_update: bool = False) -> pd.DataFrame:
        df = self.load_metadata(force_update=force_update)
        # return df.iloc[:, 1].drop_duplicates()
        return df["dataset_id"].drop_duplicates().to_frame()

    def list_dataset_timestamps(self, force_update: bool = False) -> pd.DataFrame:
        df = self.load_metadata(force_update=force_update)
        # return df.iloc[:, 2].drop_duplicates()
        return df["timestamp"].drop_duplicates().to_frame()

    def list_segment_tags(self, force_update: bool = False) -> pd.DataFrame:
        df = self.load_metadata(force_update=force_update)
        # return df.iloc[:, 3].drop_duplicates()
        return df["segment_tag"].drop_duplicates().to_frame()

    def list_dataset_profiles(self, force_update: bool = False) -> pd.DataFrame:
        df = self.load_metadata(force_update=force_update)
        # Its the 'profile_name' column
        return df["profile_name"].drop_duplicates().to_frame()

    def _get_local_profile_path(self) -> str:
        current_metadata_hash = self._get_metadata_hash()
        return f"{self._get_local_path()}/{current_metadata_hash}"

    def _download_profile(self, client: Any, work_dir: str, target_dir: str, profile: str, progress: Any) -> ProfileDownloadResult:
        def _get_tmp_local_profile_path(key: str) -> str:
            return self._add_prefix(key)

        key = _get_tmp_local_profile_path(str(profile))

        local_file = f"{work_dir}/{profile}"
        os.makedirs(os.path.dirname(local_file), exist_ok=True)

        # check if the file was already downloaded first and moved to the target_dir
        if os.path.exists(f"{target_dir}/{profile}"):
            return ProfileDownloadResult(profile, ProfileDownloadStatus.PREVIOUSLY_DOWNLOADED)

        # Or if this download was cancelled recently and the tmp dir is still around
        if os.path.exists(local_file):
            return ProfileDownloadResult(profile, ProfileDownloadStatus.PREVIOUSLY_DOWNLOADED)

        # progress.set_description(f"Downloading {key}")
        try:
            client.download_file(self.bucket, key, local_file)
        except Exception as e:
            # if its a 404 from s3
            if "404" in str(e):
                return ProfileDownloadResult(profile, ProfileDownloadStatus.MISSING)
            else:
                _logger.error(f"Failed to download {self.bucket}/{key}: {e}")
                return ProfileDownloadResult(profile, ProfileDownloadStatus.FAILED)
        finally:
            progress.update(1)

        return ProfileDownloadResult(profile, ProfileDownloadStatus.SUCCESS)

    def download_profiles(self, force_update: bool = False) -> str:
        # These are the s3 keys for the profiles in self.bucket
        profiles = self.list_dataset_profiles(force_update=force_update)

        target_dir = self._get_local_profile_path()

        # We only create the target dir after we know everything was successfully downloaded
        if os.path.exists(target_dir) and not force_update:
            _logger.info(f"Profiles already downloaded to {target_dir}")
            return target_dir

        work_dir = f".tmp/{self._get_metadata_hash()}"
        os.makedirs(work_dir, exist_ok=True)

        # for every path, download them into the _get_local_path dir with the same name
        s3_client = boto3.client("s3")
        missing_profiles: List[str] = []
        success_profiles: List[str] = []
        previously_downloaded_profiles: List[str] = []
        with tqdm(profiles, desc="Downloading profiles") as progress:
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures: List[Future[ProfileDownloadResult]] = [
                    executor.submit(self._download_profile, s3_client, work_dir, target_dir, profile, progress)
                    for profile in profiles["profile_name"]
                ]

                for future in futures:
                    result = future.result()
                    status = result.status
                    profile = result.profile
                    if status == ProfileDownloadStatus.MISSING:
                        missing_profiles.append(profile)

                        if not self.ignore_missing_profiles:
                            raise Exception(f"Missing profile: {profile}")
                    elif status == ProfileDownloadStatus.FAILED:
                        raise Exception(f"Failed to download {profile}")
                    elif status == ProfileDownloadStatus.PREVIOUSLY_DOWNLOADED:
                        previously_downloaded_profiles.append(profile)
                    else:
                        success_profiles.append(profile)

        _logger.info(f"Downloaded {len(success_profiles)} profiles to {work_dir}")
        _logger.info(f"Missing {len(missing_profiles)} profiles that weren't in the bucket")
        _logger.info(f"Previously downloaded {len(previously_downloaded_profiles)} profiles")

        # copy the files to the final location
        _logger.info(f"Copying files to {target_dir}")
        os.makedirs(target_dir, exist_ok=True)
        os.system(f"mv {work_dir}/* {target_dir}")
        os.system(f"rm -rf {work_dir}")

        return target_dir

    def _ref_profile_iterator(
        self, org_id: str, dataset_id: str, force_update: bool = False
    ) -> Generator[Tuple[DatasetProfileView, str], None, None]:
        # Make sure profiles have been downloaded
        self.download_profiles(force_update=force_update)

        df = self.load_metadata(force_update=force_update)

        dataset_df = df[(df["dataset_id"] == dataset_id) & (df["org_id"] == org_id)]
        profile_dir = self._get_local_profile_path()

        for _, row in dataset_df.iterrows():
            profile_key = row["profile_name"]
            profile_path = f"{profile_dir}/{profile_key}"
            ref_id = cast(Optional[str], row["reference_id"])
            if os.path.exists(profile_path) and ref_id is not None:
                profile = read_profile(profile_path)
                dataset_timestamp = row["timestamp"]
                datetime_timestamp = parse_date(dataset_timestamp)
                profile.set_dataset_timestamp(datetime_timestamp)
                yield profile, ref_id
            else:
                pass

    def _profile_iterator(
        self, org_id: str, dataset_id: str, force_update: bool = False, segmented: bool = False
    ) -> Generator[Optional[DatasetProfileView], None, None]:
        # Make sure profiles have been downloaded
        self.download_profiles(force_update=force_update)

        df = self.load_metadata(force_update=force_update)

        dataset_df = df[(df["dataset_id"] == dataset_id) & (df["org_id"] == org_id) & (df["segment"].isna())]
        profile_dir = self._get_local_profile_path()

        for _, row in tqdm(dataset_df.iterrows()):
            profile_key = row["profile_name"]
            profile_path = f"{profile_dir}/{profile_key}"
            if os.path.exists(profile_path):
                profile = read_profile(profile_path)
                dataset_timestamp = row["timestamp"]
                datetime_timestamp = parse_date(dataset_timestamp)
                profile.set_dataset_timestamp(datetime_timestamp)
                yield profile
            else:
                yield None

    def _denormalize_df(self, df: pd.DataFrame):
        flattened_data = {}

        for column_name, row in df.iterrows():
            for metric in df.columns:
                # Create new column name by combining original column name (expected to be the index) and metric name
                new_col_name = f"{column_name} - {metric}"
                flattened_data[new_col_name] = row[metric]

        return pd.DataFrame([flattened_data])

    def _profile_metric_iterator(
        self, org_id: str, dataset_id: str, metric_names: List[str], column_names: List[str], force_update=True
    ) -> Generator[pd.DataFrame, None, None]:
        for profile in self._profile_iterator(org_id, dataset_id, force_update=force_update):
            if profile is not None:
                profile_df: pd.DataFrame = profile.to_pandas()

                metrics = profile_df[metric_names].reindex(column_names).T

                value = metrics[column_names].T

                value = self._denormalize_df(value)
                value["timestamp"] = profile.dataset_timestamp

                yield value

    def _get_first_profile(self, org_id: str, dataset_id: str, force_update: bool = False) -> DatasetProfileView:
        # get the first item out of the iterator
        profile = next(self._profile_iterator(org_id, dataset_id, force_update=force_update))

        if profile is None:
            raise Exception(f"No profiles found for dataset {dataset_id}")

        return profile

    def list_profile_columns(self, org_id: str, dataset_id: str, force_update: bool = False) -> pd.DataFrame:
        profile = self._get_first_profile(org_id, dataset_id, force_update=force_update)
        profile_df = profile.to_pandas()
        columns = profile_df.T.columns
        # return as a dataframe
        return pd.DataFrame(list(columns), columns=["column_name"])  # pyright: ignore[reportArgumentType]

    def preview_data(self, org_id: str, dataset_id: str, force_update: bool = False) -> pd.DataFrame:
        """
        Just dumps the first profile to a pandas dataframe so you can see whats in there. It won't include all
        data necessarily because data can be introduced in later profiles.
        """
        profile = self._get_first_profile(org_id, dataset_id, force_update=force_update)
        return profile.to_pandas()

    def list_profile_metrics(self, org_id: str, dataset_id: str, force_update: bool = False) -> pd.DataFrame:
        profile = self._get_first_profile(org_id, dataset_id, force_update=force_update)
        profile_df = profile.to_pandas()
        columns = profile_df.columns
        # return as a dataframe
        return pd.DataFrame(columns, columns=["column_name"])  # pyright: ignore[reportArgumentType]

    def show_column_plot(
        self,
        org_id: str,
        dataset_id: str,
        column_names: List[str],
        metric_names: List[str],
        force_update: bool = False,
    ):
        # TODO figure out how to directly get the value of the metrics rather than using the pandas frame
        data: pd.DataFrame = pd.concat(
            [
                it
                for it in self._profile_metric_iterator(org_id, dataset_id, metric_names, column_names, force_update=force_update)
                if it is not None
            ]
        )

        # reduce the data to a single dataframe with concat

        fig = plot_time_series_df(data)
        fig.show()

    def get_profiles_by_date(
        self, org_id: str, dataset_id: str, force_update: bool = False, start: Optional[int] = None, end: Optional[int] = None
    ) -> Generator[DatasetProfileView, None, None]:
        # Iterate over all profiles to get all of the ones between the start and end dates
        for profile in self._profile_iterator(org_id, dataset_id, force_update=force_update):
            if profile is None:
                continue

            dataset_timestamp = cast(datetime, profile.dataset_timestamp)
            dataset_timestamp_ms = int(dataset_timestamp.timestamp() * 1000)

            if start is not None and dataset_timestamp_ms < start:
                continue

            if end is not None and dataset_timestamp_ms > end:
                continue

            yield profile

    def get_reference_profile(self, org_id: str, dataset_id: str, id: str, force_update: bool = False) -> Optional[DatasetProfileView]:
        for profile, ref_id in self._ref_profile_iterator(org_id, dataset_id, force_update=force_update):
            if ref_id == id:
                return profile

    def get_merged_profile(
        self, org_id: str, dataset_id: str, force_update: bool = False, start: Optional[int] = None, end: Optional[int] = None
    ) -> Tuple[DatasetProfileView, int]:
        # Iterate over all profiles to get all of the ones between the start and end dates
        profile = DatasetProfileView.zero()
        total = 0
        for profile in self.get_profiles_by_date(org_id, dataset_id, force_update=force_update, start=start, end=end):
            profile = profile.merge(profile)
            total += 1

        return profile, total
