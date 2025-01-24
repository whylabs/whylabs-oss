from songbird_client import Configuration
from datetime import datetime, timedelta
import os

# Source code lives in songbird-service
# This refresher uses AWS STS to generate a songbird identity
class KeyRefresher:
    def __init__(self, caller_name, role_name = None, duration=900):
        if role_name is None:
            role_name = os.environ['SONGBIRD_ACCESS_ROLE']
        self._caller_name = caller_name
        self._role_name = role_name
        self._duration = 900
        self._sts = None
        self._expiration_time = datetime.now()
        self._cached_credentials = None

    def __call__(self, config: Configuration):
        import boto3
        import json
        import base64

        if self._cached_credentials is None or self._expiration_time < datetime.now():
            if self._sts is None:
                self._sts = boto3.client('sts')
            assume_role_res = self._sts.assume_role(
                RoleArn=self._role_name,
                RoleSessionName=self._caller_name, DurationSeconds=self._duration)
            credentials = assume_role_res['Credentials']
            credentials.pop('Expiration') # we don't bother serialize this field

            # expires the cache a bit earlier to be sure that we pass a valid cred
            self._expiration_time = datetime.now() - timedelta(seconds=(self._duration - 10))
            self._cached_credentials = json.dumps(credentials)

        config.api_key={"ApiKeyAuth": self._cached_credentials}
