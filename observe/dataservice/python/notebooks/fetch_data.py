import requests
from io import BytesIO
import pandas as pd
import json


def fetch_data(org_id: str, model_id: str):
    with open('implycookie.json') as f:
        data = json.loads(f.read())
        sid_cookie = data['cookie']
    if sid_cookie is None:
        raise ValueError("Missing cookie for imply")

    cookies = {
        'connect.sid': sid_cookie,
    }

    headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json;charset=UTF-8',
        # 'Cookie': 'connect.sid=foo',
        'Origin': 'https://whylabs-prod.implycloud.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) '
                      'Chrome/105.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="105", "Not)A;Brand";v="8", "Chromium";v="105"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
    }

    json_data = {
        'queryType': 'groupBy',
        'dimensions': [
            'columnName',
            'orgId',
            'datasetId',
            'tags',
        ],
        'dataSource': 'whylogs-whylabs-rollup',
        'granularity': 'day',
        'intervals': [
            '2021-09-30T23:07:33.000Z/2022-10-01T23:07:33.000Z',
        ],
        'filter': {
            'type': 'and',
            'fields': [
                {
                    'type': 'selector',
                    'dimension': 'orgId',
                    'value': org_id,
                },
                {
                    'type': 'selector',
                    'dimension': 'datasetId',
                    'value': model_id,
                },
                {
                    "type": "not",
                    "field": {
                        "type": "selector",
                        "dimension": "columnName",
                        "value": "__internal__.datasetMetrics"
                    }
                }
            ],
        },
        'aggregations': [
            {
                'type': 'kllFloatsSketch',
                'name': 'median',
                'fieldName': 'histogram',
                'fractions': [
                    0.5,
                ],
            },
        ],
        'descending': True,
        'context': {
            'skipEmptyBuckets': False
        },
    }

    response = requests.post('https://whylabs-prod.implycloud.com/druid/bcfbd549-3e5c-42f3-a953-ec77f56e7be2/druid/v2',
            cookies=cookies, headers=headers, json=json_data)

    if response.status_code != 200:
        raise ValueError("Exception!")

    df = pd.json_normalize(json.loads(response.content), sep='_').rename(columns={
        'event_median': 'median'
    }).drop(columns=['version', 'event_orgId', 'event_tags', 'event_datasetId'])
    df['median'] = df['median'].apply(lambda x: x[0]).astype(float)
    df['timestamp'] = pd.to_datetime(df.timestamp).map(pd.Timestamp)

    return df
