from typing import Optional

import click
from click.core import Context

from data_merger.data_export_manager import DataExportManager
from data_merger.logging_setup import setup


def common_options(context: Context):
    bucket = context.obj["bucket"]
    force = context.obj["force"]
    prefix = context.obj["prefix"]
    return bucket, force, prefix


@click.group()
@click.option("--bucket", required=True, type=str, help="S3 bucket to download data from")
@click.option("--prefix", required=False, type=str, help="The s3 prefix to use if there is one")
@click.option("--force", is_flag=True, help="Force downloads, even if the data is already present")
@click.pass_context
def cli(context: Context, bucket: str, force: bool = False, prefix: Optional[str] = None):
    context.ensure_object(dict)
    context.obj["bucket"] = bucket
    context.obj["force"] = force
    context.obj["prefix"] = prefix


@cli.command()
@click.pass_context
def download_metadata(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.load_metadata(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def list_orgs(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.list_orgs(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def list_models(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.list_models(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def list_dataset_timestamps(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.list_dataset_timestamps(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def list_segment_tags(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.list_segment_tags(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def list_dataset_profiles(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.list_dataset_profiles(force_update=force)
    print()
    print(df.to_json(orient="records"))


@cli.command()
@click.pass_context
def download_profiles(context: Context):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    download_dir = manager.download_profiles(force_update=force)
    print()
    print(download_dir)


@cli.command()
@click.option("--org_id", required=True, type=str)
@click.option("--dataset_id", required=True, type=str)
@click.pass_context
def preview_data(context: Context, org_id: str, dataset_id: str):
    bucket, force, prefix = common_options(context)
    manager = DataExportManager(bucket=bucket, prefix=prefix)
    df = manager.preview_data(org_id, dataset_id, force_update=force)
    print()
    print(df.to_json(orient="records"))


if __name__ == "__main__":
    setup()
    cli()
