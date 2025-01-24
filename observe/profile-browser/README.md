# Setup

Use poetry to install dependencies and scripts.

```
poetry install
```

# Downloading Profiles

To run the profile-browser command (`pb`) use this

```bash
poetry run pb --help
```

Here is an overview of the commands

```bash
Usage: pb [OPTIONS] COMMAND [ARGS]...

Options:
  --bucket TEXT  S3 bucket to download data from  [required]
  --prefix TEXT  The s3 prefix to use if there is one
  --force        Force downloads, even if the data is already present
  --help         Show this message and exit.

Commands:
  download-metadata
  download-profiles
  list-dataset-profiles
  list-dataset-timestamps
  list-models
  list-orgs
  list-segment-tags
  preview-data

```

Here is an example of downloading profiles and metadata.

```bash
poetry run pb --bucket my-data-bucket download-profiles
```

The easiest way to browse profile data from this point is to use the `demo.ipynb` notebook.
