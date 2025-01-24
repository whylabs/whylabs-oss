#!/usr/bin/env bash

set -ex

apt-get update
apt-get install -y -V ca-certificates lsb-release wget gcc make g++ postgresql-server-dev-14 curl unzip

wget https://apache.jfrog.io/artifactory/arrow/$(lsb_release --id --short | tr 'A-Z' 'a-z')/apache-arrow-apt-source-latest-$(lsb_release --codename --short).deb
apt-get install -y -V ./apache-arrow-apt-source-latest-$(lsb_release --codename --short).deb
apt-get update
apt-get install -y -V libarrow-dev libparquet-dev

curl -sL https://github.com/adjust/parquet_fdw/archive/d15664ebdcb1cbb759a7bb39fd26fb2fa2fff3ea.zip  -o parquet_fdw.zip
unzip parquet_fdw.zip
mv parquet_fdw-* parquet_fdw

cd parquet_fdw
make clean
make
make install
cd ..
rm -fr parquet_fdw