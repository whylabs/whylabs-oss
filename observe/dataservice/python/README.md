## Set up Python Environment

* Miniconda (https://docs.conda.io/en/latest/miniconda.html)
* Install global poetry
```
curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python -
```
* Create a new Conda environment for Poetry. This will be the Python environment that poetry uses to
  create the actual development virtual environment

```
conda create -n whylogs-processing-core --file conda-osx-64.lock
```

Or if you are using Linux, you'll need:

```
conda create -n whylogs-processing-core --file conda-linux-64.lock
```

This will install Python 3.9, poetry and pip. You'll need to activate this enviornment

```
conda activate whylogs-processing-core
```

After that, you can use `poetry` to install the dependencies

```
poetry install
```

## Run the job

Locally you can run `WhyLogsProcessingDemoSuite` with both Python and Java setup. You'll need to
override the local Python environment with your poetry path. So in your Intellij's run
configuration, ensure that you have the poetry's installed version first:

My environment override looks like this:

```
PYSPARK_PYTHON=/Volumes/Workspace/whylabs-processing-core/.venv/bin/python
```

## Build the image

* Build x86 image:
```
make docker-x86
```

* Use the new Docker build toolkit to build the Python image:

```
docker buildx build -f aarch64.Dockerfile -t whylabs:local . --load
```

* Note that the Docker image is building using `mamba` because `conda` is super slow

## Deploy to EMR

A bit tricky, needs Docker but it's doable.

* Creating a cluster following
  this: https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-docker.html
* Example
  cluster: https://us-west-2.console.aws.amazon.com/elasticmapreduce/home?region=us-west-2#cluster-details:j-25JFJLO7O16GV
* Upload our JAR
* Publish a docker image from `prod.Dockerfile`
* Example: `222222222222.dkr.ecr.us-west-2.amazonaws.com/andy:emr2`
* Submit a step:

```
spark-submit --deploy-mode client --master yarn 
--conf spark.executorEnv.YARN_CONTAINER_RUNTIME_TYPE=docker -
-conf spark.executorEnv.YARN_CONTAINER_RUNTIME_DOCKER_IMAGE=222222222222.dkr.ecr.us-west-2.amazonaws.com/andy:emr2 
--conf spark.yarn.appMasterEnv.YARN_CONTAINER_RUNTIME_TYPE=docker 
--conf spark.yarn.appMasterEnv.YARN_CONTAINER_RUNTIME_DOCKER_IMAGE=222222222222.dkr.ecr.us-west-2.amazonaws.com/andy:emr2 
--class ai.whylabs.batch.jobs.manual.PyArimaJob 
s3://whylabs-andy-data-us-west-2/emr/docker3.jar
```

## Update dependencies

* If you want to update Python/poetry/pip, you'll need `conda-lock`. First, install `conda-lock` to
  the base environment:

```
conda install conda-lock -n base -c conda-forge
```

* Update the `environment.yml` file with new dependencies. Note that we're not using this file to
  lock version, just for the initial installation purpose
* Generate the lock files with:

```
conda lock -p osx-64 -p linux-64 -f environment.yml
```