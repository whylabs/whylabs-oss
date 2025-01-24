#!/usr/bin/env bash

inputspec="$1"
curl -v http://localhost:8888/druid/indexer/v1/supervisor -H 'Content-Type: application/json' -d @$inputspec

