#!/bin/sh

set -e

echo "Execute 'wait-for-it.sh' script"

yarn install
#rm src/public -fr || true

export NODE_ENV=development

source ./container/postgres.env

echo "Waiting for postgres to be ready..."
./container/scripts/wait-for-it.sh ${PG_HOST}:5432 --timeout=30 --strict -- echo "postgres up and running"

export DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$PG_HOST:$PG_PORT/$POSTGRES_DB"

# Must deploy first before attempting to generate typedsql
yarn run prisma migrate deploy

# Generate Prisma Client and typedsql
yarn run prisma generate --sql

yarn monorepo:dev
