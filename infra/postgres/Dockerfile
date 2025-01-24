# vim:set ft=dockerfile:
#
# Copyright The CloudNativePG Contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
FROM postgres:14.13-bullseye

COPY requirements.txt /

# Install additional extensions
RUN set -xe; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		"postgresql-${PG_MAJOR}-pgaudit" \
		"postgresql-${PG_MAJOR}-pgvector" \
		"postgresql-${PG_MAJOR}-pg-failover-slots" \
	; \
	rm -fr /tmp/* ; \
	rm -rf /var/lib/apt/lists/*;

# Install barman-cloud
RUN set -xe; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		# We require build dependencies to build snappy 0.6
		# on Python 3.11 or greater.
		# TODO: Remove build deps once barman unpins the snappy version or
		# https://github.com/EnterpriseDB/barman/issues/905 is completed
		build-essential python3-dev libsnappy-dev \
		python3-pip \
		python3-psycopg2 \
		python3-setuptools \
	; \
	pip3 install --upgrade pip; \
	# TODO: Remove --no-deps once https://github.com/pypa/pip/issues/9644 is solved
	pip3 install --no-deps -r requirements.txt; \
	# We require build dependencies to build snappy 0.6
	# on Python 3.11 or greater.
	# TODO: Remove build deps once barman unpins the snappy version or
	# https://github.com/EnterpriseDB/barman/issues/905 is completed
	apt-get remove -y --purge --autoremove \
		build-essential \
		python3-dev \
		libsnappy-dev \
	; \
	rm -rf /var/lib/apt/lists/*;

COPY scripts/build.sh /build.sh


RUN chmod +x /build.sh && /build.sh

RUN apt update && apt install -y postgresql-14-pg-stat-kcache postgresql-14-cron postgresql-14-pgextwlist postgresql-plpython3-14

COPY scripts/install_extensions.sh /
RUN /install_extensions.sh

COPY scripts/install_parquet_fdw.sh /install_parquet_fdw.sh
RUN /install_parquet_fdw.sh

COPY scripts/envdir.sh /usr/bin/envdir
RUN chmod +x /usr/bin/envdir

RUN pip install whylogs


# Change the uid of postgres to 26
RUN usermod -u 26 postgres
RUN mkdir -p /home/postgres && chown postgres:postgres /home/postgres
 
USER 26
RUN mkdir -p /home/postgres/pgdata/pgroot && \
	ln -s /var/lib/postgresql/data/pgdata /home/postgres/pgdata/pgroot/data
