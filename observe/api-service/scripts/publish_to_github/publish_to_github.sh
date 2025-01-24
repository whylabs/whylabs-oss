#!/bin/sh
# This script is used to publish the whylabs-client-python on Gitlab to the whylabs-client-python repo on Github
# It is preferred that you have SSH configured locally for Github, as it's the default configuration in this script
#
# Usage example: /bin/sh ./publish_to_github.sh

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$parent_path"

client_version=$(python3 ../setup.py --version)
release_note="Update client to version $client_version"
target_branch="release-$client_version"

# PS: Change this if you are not using SSH
github_host_url="git@github.com:whylabs/whylabs-client-python.git"


# Copy files to be pushed to the Gitub repo to a directory called `gitlab_files`
/bin/sh ./copy_files.sh gitlab_files

# Push files to the whylabs-client-python repo
git clone "$github_host_url"

# Remove updatable files and copy new ones
rm -rf ./whylabs-client-python/whylabs_client ./whylabs-client-python/docs \
    ./whylabs-client-python/README.md ./whylabs-client-python/RELEASE.md \
    ./whylabs-client-python/requirements.txt ./whylabs-client-python/setup.py \
    ./whylabs-client-python/setup.cfg

cp -r gitlab_files/* ./whylabs-client-python

# Push to the whylabs-client-python repo
cd whylabs-client-python

# Configure separate remote
git remote add github-origin $github_host_url

git checkout -b "$target_branch"
git add *
git commit -m "[whylabs-client-python] Auto-update client code to $target_branch"
git push github-origin -u "$target_branch"

# Remove the cloned repo and the copied files
git remote remove github-origin
cd ..
rm -rf whylabs-client-python gitlab_files
