#!/bin/sh

set -e

# Function to get the first non-empty value
get_env_or_fallback() {
    eval echo \${$1:-\${$2:-}}
}

# Define the path to the secrets file
SECRETS_FILE="/var/secrets/whylabs.ai/postgres.json"

# Get various postgres
POSTGRES_USER=$(get_env_or_fallback POSTGRES_USER DB_USER)
PG_HOST=$(get_env_or_fallback DB_HOST PG_HOST)
PG_PORT=$(get_env_or_fallback DB_PORT PG_PORT)

if [ -z "$POSTGRES_USER" ] || [ -z "$PG_HOST" ] || [ -z "$PG_PORT" ]; then
    echo "Error: POSTGRES_USER, PG_HOST, PG_PORT must be set" >&2
    exit 1
fi

# Use PG_PASSWORD_JSON_KEY environment variable, default to 'POSTGRES_PASSWORD' if not set
PG_PASSWORD_JSON_KEY="${PG_PASSWORD_JSON_KEY:-POSTGRES_PASSWORD}"

if [ -n "$POSTGRES_PASSWORD" ]; then
    PASSWORD="$POSTGRES_PASSWORD"
elif [ -f "$SECRETS_FILE" ]; then
    PASSWORD=$(jq -r '.$PG_PASSWORD_JSON_KEY // empty' "$SECRETS_FILE")
else
    echo "Error: POSTGRES_PASSWORD not set and $SECRETS_FILE not found" >&2
    exit 1
fi

# Check if PASSWORD is empty
if [ -z "$PASSWORD" ]; then
    echo "Error: Failed to retrieve password from environment variable or $SECRETS_FILE" >&2
    exit 1
fi

# Set default value for POSTGRES_DB if not specified
POSTGRES_DB=${POSTGRES_DB:-whylabs}

# Construct DATABASE_URL
DATABASE_URL="postgres://$POSTGRES_USER:$PASSWORD@$PG_HOST:$PG_PORT/$POSTGRES_DB"

# Export the constructed URL
export DATABASE_URL

prisma migrate deploy

node dist/app.js
