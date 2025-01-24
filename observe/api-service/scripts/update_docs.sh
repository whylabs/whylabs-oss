#!/bin/sh
set -ex

dir=$1
if [[ "$OSTYPE" == "darwin"* ]]; then
  # Mac OSX
  find $dir -type f \( -name "*.md" -o -name "configuration.py" \) -exec sed -i '' -e 's/http\:\/\/localhost/https\:\/\/api.whylabsapp.com/g' {} +
else
  find $dir -type f \( -name "*.md" -o -name "configuration.py" \) -exec sed -i -e 's/http\:\/\/localhost/https\:\/\/api.whylabsapp.com/g' {} +
fi
