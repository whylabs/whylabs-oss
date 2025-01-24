# Generating updated artifacts locally
This project can be used to generate updated artifacts and models used in the the langkit metrics such as the ChromaDB used to compute similarity to known patterns such as prompt injections and or other harmful content. In order to generate these artifacts locally you can try running:

```bash
make train-chroma
```

which will call the data/scriptstraining/train_chroma.py script and outputs chromadb artifacts for each encoder and for each topic. The artifacts are stored in the local file system, in the results folder, something like: 

```bash
llm-toolkit/results/dirname/model/AllMiniLML6V2/chromadb/injection/chroma.sqlite3
```

This artifact is then used by langkit metrics such as the injections_metric_chroma, see `llm-toolkit/langkit/metrics/injections_chroma.py` where the `local_path` can specify how to instantiate the `ChromaVectorDB`

# Developing

Install requirements first:

- [Git LFS](https://git-lfs.com/) for the data we commit to this repo

To get changes merged into `mainline` you'll want to create a PR from any branch.

```bash
git push origin HEAD:my-branch
```

To run the CI checks locally run the following.

```bash
make lint format test
```

Before `make test` will work, you need to run `make install` and `make data-load` to download the assets.
You also need to provide an org-0 WhyLabs production API key.

The songbird-client is downloaded from a private gitlab repo - you will need a
[personal access token](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html) to access it. You can set
poetry to use your PAT with the following command:

```bash
poetry config http-basic.songbird_client_gitlab <gitlab-user-name> <gitlab-pat>
```

And to automatically fix everything that can be fixed you can run

```bash
make fix
```

If you are making dataset changes, it is possible that the exclusion list will change. If you need to update the exclusion list, you can run the following command:

```bash
make generate-exclusion-list
```

# Releasing

Releasing has a few steps to it. The first step is to bump the version number, which will usually look like this if you're bumping the patch version.

```bash
# bump-patch will go from 0.1.0 to 0.1.1-dev0
make bump-patch

# bump-release will just shave off the -dev0 if you don't need a dev build
make bump-release
```

That will generate changes that you can review and commit to git.

```bash
git add -p
git commit -m "Bumping for release"
```

Then you can send a PR for these changes to `mainline` just to make sure CI isn't broken.

```bash
# Create a PR after pushing to a branch
git push origin HEAD:my-branch-name
```

After the CI clears and the PR merges you can open another PR from `mainline` into `release` via the Gitlab UI. When that PR merges it will
kick off a release CI pipeline that will publish the python package to the private Gitlab repo as the new version.

# Poetry lock on a Mac

If you're on a Mac and make dependency updates, you may need to use a linux VM to get a lock file that is consistent
with the CI pipeline. 

```bash
docker run --rm -it -v $(pwd):/work python:3.10-bookworm sh
cd /work
pip install poetry==1.7.1
poetry config http-basic.songbird_client_gitlab <gitlab-user> <gitlab-pat>>
poetry lock --no-update
```
