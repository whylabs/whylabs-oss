# DEVELOPMENT DOCKER IMAGE FOR TESTING
FROM amazoncorretto:11

RUN yum -y update
RUN yum -y install yum-utils
RUN yum -y groupinstall development

RUN yum list python3*
RUN yum -y install python3 python3-dev python3-pip python3-virtualenv

RUN python -V
RUN python3 -V

ENV PYSPARK_DRIVER_PYTHON python3
ENV PYSPARK_PYTHON python3

RUN pip3 install -U pip
RUN pip3 install poetry

RUN mkdir /home/spark
WORKDIR /home/spark

ARG SPARK_VERSION=3.4.1
ARG HADOOP_VERSION=3.3.3
ARG SPARK_PACKAGE=spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}
ARG SPARK_HOME=/usr/spark-${SPARK_VERSION}
RUN curl -sL --retry 3 \
  "https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/${SPARK_PACKAGE}.tgz" \
  | tar xz -C /tmp/ \
 && mv /tmp/$SPARK_PACKAGE $SPARK_HOME \
 && chown -R root:root $SPARK_HOME

# Get the dependencies for the project locally
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.in-project true && poetry install --no-root

RUN ls /usr

ENV SPARK_HOME=/usr/spark-${SPARK_VERSION}
ENV PYTHONPATH /home/spark/.venv

COPY . .

ENV PATH=${PYTHONPATH}/bin:${SPARK_HOME}/bin:${PATH}

# This deals with the fact that `apt-get install` up there installs
# python to /usr/bin/python3.7, which is different than the location
# of python3 in python:3.7-buster
RUN rm /home/spark/.venv/bin/python
RUN ln -s /usr/bin/python3.7 /home/spark/.venv/bin/python

RUN ./gradlew

RUN poetry install

RUN ./gradlew test