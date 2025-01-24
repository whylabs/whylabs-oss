# find the ref profile id
from datetime import datetime

from whylabs_toolkit.helpers.utils import get_dataset_profile_api


def get_ref_profile_by_name(org_id: str, dataset_id: str, name: str):
    api = get_dataset_profile_api()
    to_timestamp = int(datetime.now().timestamp() * 1000)
    ref_profiles = api.list_reference_profiles(org_id, dataset_id, from_epoch=0, to_epoch=to_timestamp)
    ref_profile = next((r for r in ref_profiles if r.alias == name), None)
    if ref_profile is None:
        raise Exception('No reference profile found')
    return ref_profile


def check_create_ref_profile(org_id: str, dataset_id: str, name: str, profile):
    api = get_dataset_profile_api()
    to_timestamp = int(datetime.now().timestamp() * 1000)
    ref_profiles = api.list_reference_profiles(org_id, dataset_id, from_epoch=0, to_epoch=to_timestamp)
    ref_profile = next((r for r in ref_profiles if r.alias == name), None)
    if ref_profile is None:
        profile.writer('whylabs').option(reference_profile_name=name).write()
    return ref_profile

