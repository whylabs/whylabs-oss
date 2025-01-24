#!/bin/sh

echo "Running prisma script..."

PG_HOST_OLD=$PG_HOST
export $(cat container/postgres.env)

# if PG_HOST_OLD is set, override PG_HOST environment variable
if [ -n "$PG_HOST_OLD" ]; then
  export PG_HOST=$PG_HOST_OLD
fi

export DATABASE_URL=postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$PG_HOST:$PG_PORT/$POSTGRES_DB

prisma "$@"
