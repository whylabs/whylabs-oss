from typing import Optional

import requests
import json


class ServiceException(Exception):
    def __init__(self, status, msg):
        super().__init__(f'{self.__class__.__name__} request failed with status {status}: {msg}')
        self.status = status


class ServiceWrapper:
    default_url = ''

    def __init__(self, options: Optional[dict] = None):
        options = options if options else {}
        self.svc_url = options.get('url', self.default_url)
        self.default_headers = options.get('headers', {'Content-Type': 'application/json'})

    def _request(self, path: str, request: Optional[dict], options: Optional[dict], mode='post'):
        headers = self.default_headers.copy()
        headers.update(options.get('headers', {}) if options else {})
        requests_call = getattr(requests, mode)
        url = self.svc_url + path
        response = requests_call(url, headers=headers) if mode == 'get' else requests_call(
            url,
            data=json.dumps(request),
            headers=headers)
        if response.status_code != 200:
            raise ServiceException(response.status_code,
                                   f'reason: {response.reason} url: {url} details: {response.content}')
        return json.loads(response.text)

    def _post(self, path: str, request: dict, options: Optional[dict] = None):
        return self._request(path, request, options, mode='post')

    def _put(self, path: str, request: dict, options: Optional[dict] = None):
        return self._request(path, request, options, mode='put')

    def _get(self, path: str, options: Optional[dict] = None):
        return self._request(path, None, options, mode='get')
