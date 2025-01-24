#!/bin/bash

# Function to display usage information
usage() {
    echo "Usage: $0 <env_dir> timeout <timeout> <script> <wal_file> <target_path>"
    exit 1
}

# Check if we have the correct number of arguments
if [ "$#" -ne 6 ]; then
    usage
fi

ENV_DIR="$1"
TIMEOUT="$3"
SCRIPT="$4"
WAL_FILE="$5"
TARGET_PATH="$6"

# Execute the mapped command
echo "/controller/manager wal-restore --log-destination /controller/log/postgres.json $WAL_FILE $TARGET_PATH"

exec /controller/manager wal-restore --log-destination /controller/log/postgres.json "$WAL_FILE" "$TARGET_PATH"