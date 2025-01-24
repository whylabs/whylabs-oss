import json
import os
import logging
from smart_config.client.helpers.utils import env_setup

# set env and uncomment the relevant org_id, dataset_id, api_key
# set analyzer_id if you are using 'run_diagnose_analyzer'
# env = 'production'
env = 'development'

if env == 'development':
    # api_endpoint = 'http://localhost:8080'
    api_endpoint = 'http://dev-songbird'
    data_svc_url = 'http://dev-dataservice/'
    org_id = 'org-0'
    dataset_id = 'model-0'
    api_key = 'xxx'

if env == 'production':
    api_endpoint = 'https://api.whylabsapp.com'
    data_svc_url = 'http://prod-dataservice/'

    api_key = json.dumps(
        {"AccessKeyId": "xxx", "SecretAccessKey": "xxx", "SessionToken": "xxx"}
    )
    org_id = 'org-0'
    dataset_id = 'model-0'
    api_key = 'xxx'

logging.basicConfig(level=logging.INFO)

os.environ['DATA_SERVICE_API_ENDPOINT'] = data_svc_url

env_setup(
    org_id=org_id,
    dataset_id=dataset_id,
    api_key=api_key,
    whylabs_endpoint=api_endpoint
)
