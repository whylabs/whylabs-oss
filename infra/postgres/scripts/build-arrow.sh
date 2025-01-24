#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
MAKEFLAGS="-j $(grep -c ^processor /proc/cpuinfo)"
export MAKEFLAGS

set -ex

apt update

apt install -y libarrow-dev libparquet-dev

apt install -y "postgresql-server-dev-14" 

curl -sL https://github.com/adjust/parquet_fdw/archive/refs/heads/master.zip  -o parquet_fdw.zip
unzip parquet_fdw.zip
mv parquet_fdw-* parquet_fdw

cd parquet_fdw
make clean
make
make install



