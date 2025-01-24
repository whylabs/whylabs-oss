import { CircularProgress, Input } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Search from '@material-ui/icons/Search';
import { IconInfoCircle } from '@tabler/icons';
import {
  WhyLabsAlert,
  WhyLabsButton,
  WhyLabsNumberInput,
  WhyLabsSelect,
  WhyLabsSubmitButton,
  WhyLabsText,
  WhyLabsTextInput,
  WhyLabsTypography,
} from 'components/design-system';
import WhyLabsTable from 'components/design-system/table/WhyLabsTable';
import {
  GetAllModelsForSettingsPageQuery,
  ModelUpdateParams,
  TimePeriod,
  useBulkUpdateModelsMutation,
  useCreateBulkSettingsPageMutation,
  useGetAllModelsForSettingsPageLazyQuery,
} from 'generated/graphql';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isFreeSubscriptionTier, isItOverSubscriptionLimit } from 'utils/subscriptionUtils';
import { useUserContext } from 'hooks/useUserContext';
import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import {
  getAvailableModelTypes,
  getGroupLabelForModelType,
  getLabelForModelType,
  getValidOrUnknownModelType,
} from 'utils/modelTypeUtils';
import { isTimePeriod } from 'utils/timePeriodUtils';
import { NullableString } from 'types/genericTypes';
import { useDeepCompareEffect } from 'hooks/useDeepCompareEffect';
import ExternalLink from 'components/link/ExternalLink';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useModelSettingsPageContentStyles } from './ModelSettingsPageContentAreaCSS';
import TableRowForEdit, { LoadingField } from './TableRowForEdit';

type ResourceType = GetAllModelsForSettingsPageQuery['models'][0];

/**
 * Renders a warning about the Python client version if the user is creating or has already created resources from the new categories
 */
const renderClientVersionWarning = () => {
  return (
    <WhyLabsAlert
      title="Python client version"
      icon={
        <IconInfoCircle
          style={{
            height: 18,
            width: 'fit-content',
          }}
        />
      }
    >
      We recommend that you upgrade the latest <ExternalLink to="whylabsPythonClient">whylabs-client</ExternalLink>{' '}
      version to avoid issues with resource management with &quot;pip install --upgrade whylabs-client&quot;
    </WhyLabsAlert>
  );
};

const DEFAULT_NAME = '';
const DEFAULT_TYPE = null;
const DEFAULT_TIME_PERIOD = TimePeriod.P1D;
const DEFAULT_TOTAL_TO_ADD = 1;

export default function ModelSettingsPageContentArea(): JSX.Element {
  const { getCurrentUser } = useUserContext();

  useSetHtmlTitle('Resource management');

  const { classes, cx } = useModelSettingsPageContentStyles();

  const recentlyCreatedResources = useRef<Set<string>>(new Set([]));

  const [resourceName, setResourceName] = useState(DEFAULT_NAME);
  const [resourceType, setResourceType] = useState<NullableString>(DEFAULT_TYPE);
  const [resourceTimePeriod, setResourceTimePeriod] = useState<NullableString>(DEFAULT_TIME_PERIOD);
  const [totalToAdd, setTotalToAdd] = useState(DEFAULT_TOTAL_TO_ADD);

  const [isEditing, setIsEditing] = useState(false);

  const [getAllResourcesForSettings, { data, loading: allResourcesLoading, error, called, refetch }] =
    useGetAllModelsForSettingsPageLazyQuery({
      notifyOnNetworkStatusChange: true, // loading is not updated when refetch is called, unless this is true :(
    });

  const [createBulkModel, { data: createBulkData, loading: createDataLoading }] = useCreateBulkSettingsPageMutation();
  const [updateModels, { loading: updateResourcesLoading }] = useBulkUpdateModelsMutation();
  const [changedResources, setChangedResources] = useState<ModelUpdateParams[]>([]);

  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const [filterString, setFilterString] = useState('');

  const handleHappenedChange = useCallback(
    (resourceInput: ModelUpdateParams) => {
      const alreadyAddedResource = changedResources.find((r) => r.id === resourceInput.id);

      if (alreadyAddedResource) {
        setChangedResources((prevState) =>
          prevState.map((resource) => {
            if (resource.id === resourceInput.id) {
              return resourceInput;
            }
            return resource;
          }),
        );
      } else {
        setChangedResources((prevState) => [...prevState, resourceInput]);
      }
    },
    [changedResources],
  );

  useEffect(() => {
    getAllResourcesForSettings();
  }, [getAllResourcesForSettings]);

  useDeepCompareEffect(() => {
    createBulkData?.models?.createBulk?.forEach(({ id }) => {
      recentlyCreatedResources.current.add(id);
    });
  }, [createBulkData?.models?.createBulk]);

  if (called && error) {
    console.error(error);
  }

  const hasChanges = changedResources.length > 0;

  const user = getCurrentUser();
  const tier = user?.organization?.subscriptionTier;
  const isOverSubscriptionLimit = isItOverSubscriptionLimit({ modelCount: data?.models?.length || 0, tier });
  const isFreeTier = isFreeSubscriptionTier(tier);

  const filteredResources = getFilteredResources().sort(sortByRecentlyCreated);

  const isFormDisabled = !resourceName.length;

  const resourceTypeOptions = getResourceTypeOptions();
  const timePeriodOptions = getTimePeriodOptions();

  const renderForm = () => {
    return (
      <>
        <WhyLabsTypography order={5}>
          Use the form to add models or datasets to your organization. You can edit settings via the table.
        </WhyLabsTypography>
        <form onSubmit={onSubmit}>
          <div className={classes.inputsWrapper}>
            <WhyLabsTextInput
              disabled={isOverSubscriptionLimit}
              label="Model or dataset name"
              onChange={setResourceName}
              required
              value={resourceName}
            />
            <WhyLabsSelect
              data={resourceTypeOptions}
              disabled={isOverSubscriptionLimit}
              label="Resource type"
              onChange={setResourceType}
              value={resourceType}
            />
            <WhyLabsSelect
              data={timePeriodOptions}
              disabled={isFreeTier || isOverSubscriptionLimit}
              disabledTooltip="Not available in the Starter plan. Please contact us to enable other batch frequencies."
              label="Batch frequency"
              onChange={setResourceTimePeriod}
              value={resourceTimePeriod}
            />
            <WhyLabsNumberInput
              disabled={isOverSubscriptionLimit}
              label="Total to add"
              max={100}
              min={1}
              onChange={(val) => setTotalToAdd(val || 1)}
              value={totalToAdd}
            />
            {renderButton()}
          </div>
        </form>
      </>
    );
  };
  return (
    <>
      <div className={classes.pageRootWrap}>
        <div className={classes.pageRoot}>
          <div className={classes.contentSide}>
            {!isOverSubscriptionLimit && renderForm()}
            {renderClientVersionWarning()}
          </div>

          <div className={classes.contentSide}>
            <div className={classes.tableSide}>
              <WhyLabsText inherit className={cx(classes.title, classes.tableTitle)}>
                {renderTableTitle()}
              </WhyLabsText>

              <div className={classes.tableHeaderWrap}>
                <Input
                  className={classes.searchInput}
                  value={filterString}
                  startAdornment={<Search />}
                  endAdornment={
                    filterString && <CloseIcon style={{ cursor: 'pointer' }} onClick={() => setFilterString('')} />
                  }
                  onChange={({ target }) => setFilterString(target.value)}
                />
                <div className={classes.editingButtonsWrapper}>
                  {isEditing ? (
                    <>
                      <WhyLabsButton
                        color="gray"
                        disabled={updateResourcesLoading}
                        onClick={() => {
                          setChangedResources([]);
                          setIsEditing(false);
                        }}
                        variant="outline"
                      >
                        Cancel
                      </WhyLabsButton>
                      <WhyLabsSubmitButton
                        disabled={!hasChanges || updateResourcesLoading}
                        onClick={handleUpdateModels}
                      >
                        Save
                        {updateResourcesLoading && <CircularProgress style={{ marginLeft: 12 }} size={14} />}
                      </WhyLabsSubmitButton>
                    </>
                  ) : (
                    <WhyLabsButton
                      color="gray"
                      onClick={() => {
                        setIsEditing(true);
                      }}
                      variant="outline"
                    >
                      Edit models and datasets
                    </WhyLabsButton>
                  )}
                </div>
              </div>

              {/* TODO: refactor it to use WhyLabsTableKit instead */}
              <WhyLabsTable
                className={cx(classes.whyLabsTable, {
                  [classes.whyLabsTableEditing]: isEditing,
                })}
                columns={[
                  {
                    key: 'id',
                    label: 'ID',
                    minWidth: 150,
                    width: '25%',
                  },
                  {
                    key: 'name',
                    label: 'Name',
                    minWidth: 250,
                    width: '100%',
                  },
                  {
                    key: 'type',
                    label: 'Type',
                    minWidth: 200,
                  },
                  {
                    key: 'timePeriod',
                    label: 'Batch frequency',
                    minWidth: 140,
                  },
                  {
                    key: 'actions',
                    isHidden: !isEditing,
                  },
                ]}
              >
                {filteredResources.map((resource: ModelUpdateParams) => (
                  <TableRowForEdit
                    key={resource.id}
                    loading={isRowLoading(resource.id)}
                    isEditing={isEditing}
                    isFreeTier={isFreeTier}
                    model={resource}
                    modelTypeOptions={resourceTypeOptions}
                    timePeriodOptions={timePeriodOptions}
                    handleHappenedChange={handleHappenedChange}
                    refetch={refetch}
                    searchTerm={filterString}
                  />
                ))}
              </WhyLabsTable>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  function renderButton() {
    return (
      <WhyLabsSubmitButton disabled={isFormDisabled} loading={createDataLoading}>
        Add models or datasets
      </WhyLabsSubmitButton>
    );
  }

  function renderTableTitle() {
    const organization = user?.organization;
    const title = 'Models and datasets';

    if (organization) return `${title} for ${organization.name} (${organization.id})`;

    return title;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createBulkModel({
        variables: {
          modelName: resourceName,
          modelType: getValidOrUnknownModelType(resourceType),
          quantityNum: totalToAdd,
          timePeriod: isTimePeriod(resourceTimePeriod) ? resourceTimePeriod : undefined,
        },
      });
      refetch?.();
      resetForm();
      enqueueSnackbar({ title: 'Successfully created' });
    } catch (err) {
      enqueueErrorSnackbar({
        explanation: `An error occurred while creating models or datasets, please try again later`,
        err,
      });
    }
  }

  async function handleUpdateModels() {
    if (!changedResources.length) return;

    try {
      await updateModels({ variables: { models: changedResources } });
      refetch?.();

      enqueueSnackbar({ title: 'Model updated successfully' });
    } catch (err) {
      enqueueErrorSnackbar({
        explanation: 'Something went wrong',
        err,
      });
    } finally {
      setIsEditing(false);
      setChangedResources([]);
    }
  }

  function isRowLoading(id: string): LoadingField {
    const loader: LoadingField = { isLoading: false, cause: 'unknown' };

    changedResources.forEach((resource) => {
      if (resource.id === id && (updateResourcesLoading || allResourcesLoading)) {
        loader.cause = 'update';
        loader.isLoading = true;
      }
    });
    return loader;
  }

  function resetForm() {
    setResourceName(DEFAULT_NAME);
    setResourceType(DEFAULT_TYPE);
    setResourceTimePeriod(DEFAULT_TIME_PERIOD);
    setTotalToAdd(DEFAULT_TOTAL_TO_ADD);
  }

  function getResourceTypeOptions() {
    return getAvailableModelTypes().map((key) => ({
      group: getGroupLabelForModelType(key),
      label: getLabelForModelType(key),
      value: key,
    }));
  }

  function getTimePeriodOptions() {
    const availableTimePeriod: TimePeriod[] = [TimePeriod.Pt1H, TimePeriod.P1D, TimePeriod.P1W, TimePeriod.P1M];
    return availableTimePeriod.map((key) => ({
      label: convertAbbreviationToBatchType(key),
      value: key,
    }));
  }

  function getFilteredResources(): ResourceType[] {
    const allResources = data?.models || [];

    if (!filterString) return allResources;

    return allResources.filter(({ id, name, timePeriod, type }) => {
      const matches = (t: string) => t.toLowerCase().includes(filterString.toLowerCase());
      return (
        matches(name) ||
        matches(convertAbbreviationToBatchType(timePeriod)) ||
        matches(getLabelForModelType(type)) ||
        matches(id)
      );
    });
  }

  function sortByRecentlyCreated(a: ResourceType, b: ResourceType): number {
    const recentlyCreated = recentlyCreatedResources.current;
    // Recently created resources should be at the top of the list
    if (recentlyCreated.has(a.id) && !recentlyCreated.has(b.id)) return -1;
    if (!recentlyCreated.has(a.id) && recentlyCreated.has(b.id)) return 1;

    return 0;
  }
}
