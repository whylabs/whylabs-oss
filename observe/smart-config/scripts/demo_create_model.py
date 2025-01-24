from whylabs_toolkit.monitor.models import ColumnDataType

from demo_setup import demo_org_id, demo_dataset_id

# See if there's a resource and if not, create it
from smart_config.resource import get_or_create_resource, set_outputs, set_discreteness, set_data_type

resource = get_or_create_resource(demo_org_id, demo_dataset_id, f'Hackathon model {demo_dataset_id}')
print(f"Resource {resource['name']} id {resource['id']} type {resource.get('model_type', 'undefined')} granularity {resource['time_period']}")

schema = set_outputs(demo_org_id, demo_dataset_id, ['predicted', 'income'])
schema = set_data_type(demo_org_id, demo_dataset_id, ColumnDataType.fractional, ['capital-gain', 'capital-loss'])
print(f'Entity schema is {schema}')



