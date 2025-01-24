from time import sleep
from whylabs_client.exceptions import NotFoundException, ApiException
from whylabs_client.model.time_period import TimePeriod
from whylabs_toolkit.helpers.schema import ColumnsClassifiers, UpdateColumnClassifiers, UpdateEntityDataTypes, \
    UpdateColumnsDiscreteness, ColumnsDiscreteness
from whylabs_toolkit.helpers.utils import get_models_api
from whylabs_toolkit.monitor.models import ColumnDataType


def get_or_create_resource(org_id: str, dataset_id: str, name: str, granularity=TimePeriod('P1D')):
    # See if there's a model and if not, create it
    api = get_models_api()
    try:
        model = api.get_model(org_id, dataset_id)
    except NotFoundException:
        try:
            model = api.create_model(org_id, name, granularity, model_id=dataset_id)
        except ApiException as e:
            if e.status == 409:
                raise Exception(f'Model {dataset_id} has been deleted, please choose another ID')
            else:
                raise e
    return model


def get_schema(org_id: str, dataset_id: str):
    # update the schema for outputs
    api = get_models_api()
    return api.get_entity_schema(org_id, dataset_id)


def wait_for_nonempty_schema(org_id: str, dataset_id: str):
    api = get_models_api()
    waited = 0
    while waited < 30:
        result = api.get_entity_schema(org_id, dataset_id)
        if len(result.columns) > 0:
            return result
        waited += 5
        sleep(5)
    raise Exception(f'Empty schema for resource {dataset_id}')


def set_outputs(org_id: str, dataset_id: str, cols: [str]):
    # update the schema for outputs
    api = get_models_api()
    classifiers = ColumnsClassifiers(
        outputs=cols
    )
    update_entity = UpdateColumnClassifiers(
        classifiers=classifiers,
        dataset_id=dataset_id,
        org_id=org_id
    )
    update_entity.update()
    return api.get_entity_schema(org_id, dataset_id)


def set_data_type(org_id: str, dataset_id: str, data_type: ColumnDataType, cols: [str]):
    # update the schema for outputs
    api = get_models_api()
    update_entity = UpdateEntityDataTypes(
        columns_schema={c: data_type for c in cols},
        dataset_id=dataset_id,
        org_id=org_id
    )
    update_entity.update()
    # Can this be combined into one update?
    if data_type == ColumnDataType.fractional:
        set_discreteness(org_id, dataset_id, False, cols)
    if data_type == ColumnDataType.string:
        set_discreteness(org_id, dataset_id, True, cols)
    return api.get_entity_schema(org_id, dataset_id)


def set_discreteness(org_id: str, dataset_id: str, is_discrete: bool, cols: [str]):
    # update the schema for outputs
    api = get_models_api()
    discreteness = ColumnsDiscreteness(discrete=cols) if is_discrete else ColumnsDiscreteness(continuous=cols)
    update_entity = UpdateColumnsDiscreteness(
        columns=discreteness,
        dataset_id=dataset_id,
        org_id=org_id
    )
    update_entity.update()
    return api.get_entity_schema(org_id, dataset_id)