import logging
import os
import pandas as pd
import whylogs as why

from scripts.config import env_setup

demo_org_id = 'org-JR37ks'
demo_dataset_id = 'hack-5'
ref_dataset_name = 'adult-train'

env_setup(
    org_id=demo_org_id,
    dataset_id=demo_dataset_id,
    api_key='***',  # Paste in key!
    whylabs_endpoint='http://localhost:8080'
# whylabs_endpoint='http://dev-songbird'
)
logging.basicConfig(level=logging.INFO)

_this_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(f'{_this_dir}/../data_randomized_drift_missing/adult')
ref_data = f'{data_path}/adult_reference_dataset.csv'

ref_df = pd.read_csv(ref_data)
demo_ref_profile = why.log(ref_df)
