#!/bin/sh
#
# Example usage: /bin/sh ./copy_files.sh directory_name

files_to_copy=$1

if [ "$files_to_copy" = "" ]; then
    files_to_copy="files_to_copy"
    echo "[INFO] No command line input provided. Set \$files_to_copy to $files_to_copy"
fi

mkdir "$files_to_copy"
mkdir "$files_to_copy/whylabs_client"
mkdir "$files_to_copy/docs"
cp -r ../docs/* "$files_to_copy/docs"
cp -r ../whylabs_client/* "$files_to_copy/whylabs_client"
cp ../README.md "$files_to_copy"
cp ../RELEASE.md "$files_to_copy"
cp ../requirements.txt "$files_to_copy"
cp ../setup.py "$files_to_copy"
