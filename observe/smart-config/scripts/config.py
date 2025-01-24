import os


def env_setup(org_id: str, dataset_id: str, api_key: str, whylabs_endpoint: str=None):
    os.environ['WHYLABS_API_KEY'] = api_key
    os.environ['WHYLABS_DEFAULT_ORG_ID'] = org_id
    os.environ['ORG_ID'] = org_id  # why different from whylogs!
    os.environ['WHYLABS_DEFAULT_DATASET_ID'] = dataset_id
    if whylabs_endpoint:
        os.environ['WHYLABS_API_ENDPOINT'] = whylabs_endpoint
        os.environ['WHYLABS_HOST'] = whylabs_endpoint  # why different from whylogs!
