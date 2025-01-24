#!/bin/bash

export PG_AUTH_MON_COMMIT=439697fe2980cf48f1760f45e04c2d69b2748e73
export SET_USER=REL3_0_0

curl -sL "https://github.com/zalando-pg/pg_auth_mon/archive/$PG_AUTH_MON_COMMIT.tar.gz" | tar xz
git clone -b "$SET_USER" https://github.com/pgaudit/set_user.git

for n in pg_auth_mon-${PG_AUTH_MON_COMMIT} \
            set_user; do
        make -C "$n" USE_PGXS=1 clean install-strip
done
