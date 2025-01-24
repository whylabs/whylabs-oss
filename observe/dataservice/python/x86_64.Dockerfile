FROM quay.io/condaforge/mambaforge:4.11.0-0

# Install the package as normal:
COPY conda-linux-64.lock .

RUN --mount=type=cache,target=/opt/conda/pkgs mamba create --copy -p /env --file conda-linux-64.lock

ENV PATH=/env/bin:${PATH}
RUN python -v

RUN pip install poetry==1.5.1
COPY pyproject.toml poetry.lock ./

# Exclude PMDARima from the list of dependencies
RUN poetry config virtualenvs.create false

RUN poetry install --no-root --only main

WORKDIR /env
RUN find -name '*.a' -delete && \
  rm -rf /env/conda-meta && \
  rm -rf /env/include && \
  rm /env/lib/libpython3.9.so.1.0 && \
  find -name '__pycache__' -type d -exec rm -rf '{}' '+' && \
  rm -rf /env/lib/python3.9/idlelib /env/lib/python3.9/ensurepip \
    /env/lib/libasan.so.5.0.0 \
    /env/lib/libtsan.so.0.0.0 \
    /env/lib/liblsan.so.0.0.0 \
    /env/lib/libubsan.so.1.0.0 \
    /env/bin/x86_64-conda-linux-gnu-ld \
    /env/bin/sqlite3 \
    /env/bin/openssl \
    /env/lib/python3.9/site-packages/setuptools \
    /env/lib/python3.9/site-packages/Cython \
    /env/share/terminfo && \
  find /env/lib/python3.9/site-packages/scipy -name 'tests' -type d -exec rm -rf '{}' '+' && \
  find /env/lib/python3.9/site-packages/numpy -name 'tests' -type d -exec rm -rf '{}' '+' && \
  find /env/lib/python3.9/site-packages/pandas -name 'tests' -type d -exec rm -rf '{}' '+'

# Main image
#FROM public.ecr.aws/amazoncorretto/amazoncorretto:11

## Copy /venv from the previous stage:
#COPY --from=build /env /env
ENV PATH=/env/bin:${PATH}

RUN mkdir /home/spark
WORKDIR /home/spark

ENV PYSPARK_DRIVER_PYTHON python3
ENV PYSPARK_PYTHON python3

COPY . .

RUN poetry config virtualenvs.create false && poetry install --only-root

ENV GUNICORN_EXEC gunicorn
ENV STARLING_PATH /home/spark/starling
ENV WHYLABS_PYSPARK true

RUN python -c "import starling"
# Import arima so we generate cache items. Fresh imports can take 30 seconds on my mac
RUN python -c "import pmdarima"
WORKDIR starling
ENTRYPOINT [ "gunicorn", "main:app", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8099" ]
CMD ["--workers", "4"]