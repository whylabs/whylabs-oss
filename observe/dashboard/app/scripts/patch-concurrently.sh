#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "$SCRIPT_DIR"
echo "Command used (need to manually create a modified copy of package.json first): diff -Naur package.json modified-package.json > concurrently.patch"
echo 'Patching concurrently package.json. See https://github.com/open-cli-tools/concurrently/issues/425 ...'
patch --forward -u "${SCRIPT_DIR}/../node_modules/concurrently/package.json" -i "${SCRIPT_DIR}/concurrently.patch" || true
echo "Done patching"
