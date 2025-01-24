#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
MAKEFLAGS="-j $(grep -c ^processor /proc/cpuinfo)"
export MAKEFLAGS

set -ex

apt update
apt install -y curl wget

version=14

curl -s https://packagecloud.io/install/repositories/timescale/timescaledb/script.deb.sh | bash


# apt install -y -V ca-certificates lsb-release wget
# wget https://apache.jfrog.io/artifactory/arrow/$(lsb_release --id --short | tr 'A-Z' 'a-z')/apache-arrow-apt-source-latest-$(lsb_release --codename --short).deb
# apt install -y -V ./apache-arrow-apt-source-latest-$(lsb_release --codename --short).deb
# apt update

apt-get install -y timescaledb-2-postgresql-${version}='2.17.0*' timescaledb-2-loader-postgresql-${version}='2.17.0*'

BUILD_PACKAGES=(devscripts equivs build-essential 
                fakeroot debhelper git gcc g++
                libboost-all-dev libc6-dev 
                make cmake libevent-dev libbrotli-dev libssl-dev libkrb5-dev 
                curl
                zlib1g-dev
                libprotobuf-c-dev
                libpam0g-dev
                libcurl4-openssl-dev
                libicu-dev
                libc-ares-dev
                pandoc
                pkg-config
                libcurl4
                clang-13 lldb-13 lld-13
                postgresql-server-dev-14
                )

apt install -y "${BUILD_PACKAGES[@]}"

apt install -y -V ca-certificates lsb-release wget unzip wget

curl -sL https://whylabs-public.s3.us-west-2.amazonaws.com/postgres/datasketches-postgresql-extension.tar.gz | tar -xz
(
    cd datasketches-postgresql
    unzip datasketches-cpp.zip
)

ls -alh datasketches-postgresql

# export CMAKE_CXX_FLAGS="-std=c++17"
# export CXXFLAGS="-std=c++17"

# apt install -y "postgresql-server-dev-${version}" \
# Install 3rd party stuff
(
        cd datasketches-postgresql
        make
        make install
        ls -alh /usr/share/postgresql/${version}/extension/datasketches.control
)

