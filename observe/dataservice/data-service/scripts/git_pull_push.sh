#!/bin/sh
# ref: https://help.github.com/articles/adding-an-existing-project-to-github-using-the-command-line/
#
# Usage example: /bin/sh ./git_push.sh wing328 openapi-pestore-perl "gitlab.com"
set -ex

git_user_id=$1
git_repo_id=$2
git_host=$3
generated_dir=$4
gitlab_ci=$5

if [ "$git_host" = "" ]; then
    git_host="github.com"
    echo "[INFO] No command line input provided. Set \$git_host to $git_host"
fi

if [ "$git_user_id" = "" ]; then
    git_user_id="GIT_USER_ID"
    echo "[INFO] No command line input provided. Set \$git_user_id to $git_user_id"
fi

if [ "$git_repo_id" = "" ]; then
    git_repo_id="GIT_REPO_ID"
    echo "[INFO] No command line input provided. Set \$git_repo_id to $git_repo_id"
fi

if [ "$release_note" = "" ]; then
    release_note="Minor update"
    echo "[INFO] No command line input provided. Set \$release_note to $release_note"
fi

# Prepping the Git repo
rm -fr staging
mkdir staging
cd staging || exit 1
git init -b main
git remote add origin "ssh://git@${git_host}/${git_user_id}/${git_repo_id}.git"
git fetch origin
git pull origin main


# Wipe the folder and then copy the generated data over
rm -fr ./*
cp -R "../${generated_dir}"/* .
cp "../${gitlab_ci}" .gitlab-ci.yml

# Add all the changes
git add .
git status

# Commits the tracked changes and prepares them to be pushed to a remote repository.
git commit -m "From https://gitlab.com/whylabs/core/whylabs-processing-core/-/commit/${CI_COMMIT_SHA}

## Commit message:
${CI_COMMIT_MESSAGE}" || true
git log | head -n 20

# Pushes (Forces) the changes in the local repository up to the remote repository
echo "Git pushing to "ssh://${git_host}/${git_user_id}/${git_repo_id}.git""
git push origin main 2>&1 | grep -v 'To ssh'
