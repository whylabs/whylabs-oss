# Smart Configuration

This repo contains:
* hackathon work on recommending analyzers
* noisy monitor detection
  * the library code for this is in `smart_config/client` and `smart_config/server`
* scripts for running the code for both topics are in `scripts/`

## Prereqs

``` 
pip install -e .
```

For testing, `pip install pytest`

# Noisy monitor detection

## Server
The server library code is in [smart_config/server](smart_config/server). Run the server with 
```
DATA_SERVICE_API_ENDPOINT=dataservice-main-k8s.datastack.dev.whylabs \
SONGBIRD_API_ENDPOINT=https://songbird.development.whylabsdev.com \
python smart_config/server/server.py
```

The following environment variables are required:
* `DATA_SERVICE_API_ENDPOINT` - the endpoint for the data service API
* `SONGBIRD_API_ENDPOINT` - the endpoint for the songbird API

As well as calling songbird, the diagnoser service calls the data service, and so can only be used internally. It needs a VPC
connection to the relevant environment (e.g., run `k-dev-connect` or `k-prod-connect`).

When testing with a local songbird, make sure that `SONGBIRD_API_ENDPOINT` is set to `http://localhost:8080`. The
calling and called songbird instances must be in the same environment so that the API key works.

## Client 
The client server code is in [whylabs-toolkit](https://github.com/whylabs/whylabs-toolkit/tree/mainline/whylabs_toolkit/monitor/diagnoser).

You can use `python scripts/run_diagnoser.py` to run the diagnoser via the client. Edit the `scripts/diagnoser_setup.py` to set the
credentials for the dataset to be analyzed.  This script will loop through the analyzers with notification actions, starting with the
noisiest, until you press 'N' or run out of analyzers. It will then go on to analyzers without notification actions.

For testing, set the environment variable `USE_LOCAL_SERVER` to `library` to use the server library code directly from the client,
or to `server` to call a local instance of the server via REST.

When USE_LOCAL_SERVER is not set, the client will use whylabs-client to call the server in dev or prod, depending on the
SONGBIRD_API_ENDPOINT environment variable.

You can also use the diagnoser.ipynb/customized_diagnoser.ipynb notebooks in 
[whylabs-toolkit examples](https://github.com/whylabs/whylabs-toolkit/tree/mainline/whylabs_toolkit/examples.

To run against prod:
* Export AWS SSO env vars and generate a songbird access key
* Run `k-prod-connect`
* Edit `scripts/diagnoser_setup.py` to change `env=production`
* Edit `scripts/diagnoser_setup.py` to set a prod `org_id`, `dataset_id`, `api_key`
* Use `python scripts/run_diagnose_analyzer.py` to run analysis on a specific analyzer (set `analyzer_id`)

## Docker

To build and test the server locally:
```
docker build . -t diagnoser
docker run -p 8092:8092 -it --rm  -it --rm -e SONGBIRD_API_ENDPOINT=https://songbird.development.whylabsdev.com -e DATA_SERVICE_API_ENDPOINT=http://dataservice-main-k8s.datastack.dev.whylabs diagnoser
```

You can then run the client test scripts as above, with `USE_LOCAL_SERVER=server`. 


# Recommending analyzers

The main library code for this is in `smart_config/recommenders`

Scripts to run this are in  `scripts/demo_xxx.py` and `demo_notebook.ipynb`


# Advanced stuff
## Testing with a new not-yet published client
Generate a new whylabs-client in songbird:
``` 
gw build
gw generatePublicPythonClient
```

Install the new client:
```
pip install -e /path-to-songbird/generated/public-python
```

# Test with a not-yet published whylabs toolkit: 

Make changes in a local branch of whylabs toolkit, then:
```shell
pip install -e /path-to-whylabs-toolkit
```
