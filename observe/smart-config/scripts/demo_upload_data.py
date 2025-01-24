import pandas as pd
from datetime import datetime, timedelta
from demo_setup import demo_dataset_id, demo_org_id, data_path, ref_dataset_name, ref_df

import whylogs as why

from smart_config.ref_profile import check_create_ref_profile


def data_file(num):
    return f'{data_path}/adult_monitored_dataset_{num:0>2}.csv'


def log_data(filename, date):
    df = pd.read_csv(filename)
    results = why.log(df)
    results.profile().set_dataset_timestamp(date)
    results.writer('whylabs').write()
    print(f"logged {filename}")

# Run whylogs on current data and upload to WhyLabs.
current = datetime.now()
ref_ts = current - timedelta(days=14)
ts = current - timedelta(days=13)

for i in range(0, 14):
    print(ts, data_file(i))
    log_data(data_file(i), ts)
    ts = ts + timedelta(days=1)

# Upload ref data if its not already uploaded
check_create_ref_profile(demo_org_id, demo_dataset_id, ref_dataset_name, why.log(ref_df))
