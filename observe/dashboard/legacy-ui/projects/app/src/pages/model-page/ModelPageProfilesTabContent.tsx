import { useCallback, useEffect, useState, useMemo, useContext } from 'react';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { IFilterState } from 'components/chip-filter/ChipFilter';
import ProfilesTable from 'components/controls/table/profiles-table/ProfilesTable';
import { FeatureCountDiscreteWidget } from 'components/controls/widgets';
import {
  GetAnomaliesForSpecificProfileQuery,
  TimePeriod,
  useGetModelSegmentColumnCountsQuery,
  useGetSegmentSelectedProfilesQuery,
} from 'generated/graphql';
import { usePagingInfo } from 'hooks/usePagingInfo';
import { useSearchFeatureList } from 'hooks/useSearchFeatureList';
import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useRecoilState } from 'recoil';
import { useDeepCompareMemo } from 'use-deep-compare';
import { FEATURE_HIGHLIGHT_TAG, PROFILE_REPORT } from 'types/navTags';
import { NumberOrString } from 'utils/queryUtils';
import { GLOBAL_TITLE_BAR_HEIGHT } from 'components/controls/widgets/GlobalTitleBar';
import { tableSelectedRowAtom } from 'atoms/profilesTableAtom';
import { ApolloError } from '@apollo/client';
import { isDashbirdError } from 'utils/error-utils';
import {
  ProfileData,
  TableFeatureDataType,
  FeatureAnomaliesBatchData,
} from 'components/controls/table/profiles-table/types';
import { ModelProfilesSidePanel } from 'components/panels/ModelProfilesSidePanel';
import ProfilesFeaturePanel from 'components/panels/profiles-feature-panel/ProfilesFeaturePanel';
import { generateAnomalyExplanation } from 'utils/analysisUtils';
import { useSearchParams } from 'react-router-dom';
import { WhyLabsNoDataPage } from 'components/empty-states/WhyLabsNoDataPage';
import ProfileLineageWidget from 'components/controls/widgets/ProfileLineageWidget';
import { createStyles, Skeleton } from '@mantine/core';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { WhyLabsControlledTabs } from 'components/design-system';
import useGetAlertsForSegmentedProfiles from 'pages/segment-page/hooks/useGetAlertsForSegmentedProfiles';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import { MonitorSchema } from 'monitor-schema-types';
import { TABS_HEIGHT } from 'ui/constants';
import { MODEL_PAGE_TAB_BAR_HEIGHT } from './ModelPageTabBarArea';
import { NoDataMessagePage } from '../no-data-message-page/NoDataMessagePage';
import { ProfilesPageContext } from './context/ProfilesPageContext';
import { useResourceText } from './hooks/useResourceText';
import { ResourceInsightsPage } from './insights/ResourceInsightsPage';

const PANEL_HEIGHT = Spacings.tabContentHeaderHeight;

const BASE_HEIGHT_CALC = `100vh - ${MODEL_PAGE_TAB_BAR_HEIGHT}px - ${TABS_HEIGHT}px`;

const PROFILE_TAB_LABEL = 'Profile analysis';
const INSIGHT_TAB_LABEL = 'Insight explorer';

const useContentAreaStyles = createStyles(() => ({
  root: {
    display: 'flex',
    height: '100%',
    position: 'relative',
    width: '100%',
    flexGrow: 1,
  },
  profileTabRoot: {
    width: '100%',
  },
  profileTabContent: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexGrow: 1,
    height: `calc(${BASE_HEIGHT_CALC} - ${GLOBAL_TITLE_BAR_HEIGHT}px)`,
    position: 'relative',
    width: '100%',
  },
  noBatchesState: {
    display: 'flex',
    flex: 1,
    '& > div': {
      padding: '150px 150px 0 0',
    },
  },
  flexColumn: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  sidePanel: {
    width: Spacings.leftColumnWidth,
  },
  gridColumn: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  squishyTable: {
    width: 'calc(100% - 800px)',
  },
  headerRoot: {
    display: 'flex',
    height: PANEL_HEIGHT,
  },
  loadingWrapper: {
    width: '100%',
    display: 'flex',
    height: '100%',
    background: 'white',
  },
  sidePanelSkeleton: {
    width: 300,
  },
  tableSkeleton: {
    flex: 1,
  },
  tabsRoot: {
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  tabsPanel: {
    backgroundColor: Colors.white,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    height: `calc(100% - ${TABS_HEIGHT}px)`,
    padding: 0,
    width: '100%',
  },
}));

export const FILE_TEXTS = {
  DATA: {
    profileTab: 'Profiles',
  },
  MODEL: {
    profileTab: 'Profiles',
  },
  LLM: {
    profileTab: 'Insight explorer',
  },
};

function formatProfilesAnomalies(
  profile: GetAnomaliesForSpecificProfileQuery,
  monitorSchema: MonitorSchema | undefined,
  batchFrequency: TimePeriod | undefined,
): FeatureAnomaliesBatchData[] | undefined {
  if (profile.model?.anomalies) {
    return profile.model.anomalies.map((an) => ({
      featureName: an.column,
      batchTimestamp: an.datasetTimestamp,
      explanation: generateAnomalyExplanation(an, { decimals: 3, schema: monitorSchema, batchFrequency }),
      metric: an.metric,
    }));
  }
  return undefined;
}

export function ModelPageProfilesTabContent(): JSX.Element {
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  useSetHtmlTitle(resourceTexts.profileTab);

  const { classes, cx } = useContentAreaStyles();
  const pt = usePageTypeWithParams();

  const [specialCase3profilesAutoSelect, setSpecialCase3profilesAutoSelect] = useState(false);
  const [sidePanelVisibility, setSidePanelVisibility] = useState(false);
  const [sidePanelContent, setSidePanelContent] = useState<TableFeatureDataType[]>([]);
  const { pagingInfo, handleExceededLimit } = usePagingInfo();
  const [{ loadingProfilesInRange, staticProfiles, profileQueryData }] = useContext(ProfilesPageContext);
  const noProfilesInRange = !staticProfiles?.length && !profileQueryData?.length && loadingProfilesInRange === false;
  const [, setSearchParams] = useSearchParams();
  const [, setTableSelectedRow] = useRecoilState<number>(tableSelectedRowAtom);
  const [filter, setFilter] = useState<IFilterState>({});

  const { profiles, individualProfiles } = useSearchProfiles();
  const { featureList } = useSearchFeatureList();
  const [anomaliesBatchData, setAnomaliesBatchData] = useState<FeatureAnomaliesBatchData[]>(
    [] as FeatureAnomaliesBatchData[],
  );
  const { modelId, segment } = pt;
  const { monitorSchema } = useMonitorSchema({ modelId });
  const fetchProfilesVariables = useMemo(() => {
    const batchProfiles = profiles.filter((profile): profile is number => typeof profile === 'number');
    const staticProfileIds = profiles.filter((profile): profile is string => typeof profile === 'string');
    const retrievalTokens = individualProfiles.filter(Boolean);
    return {
      modelId,
      timestamps: batchProfiles,
      staticProfileIds,
      retrievalTokens,
      limit: pagingInfo.limit,
      offset: pagingInfo.offset,
      allowIndividualProfiles: false,
      filter: {
        featureNames: featureList.length > 0 ? featureList : undefined,
        includeDiscrete: filter.discrete,
        includeNonDiscrete: filter['non-discrete'],
      },
      tags: segment.tags,
      excludeEmpty: true,
    };
  }, [profiles, individualProfiles, modelId, pagingInfo.limit, pagingInfo.offset, featureList, filter, segment.tags]);

  const { data, error, loading } = useGetSegmentSelectedProfilesQuery({
    variables: fetchProfilesVariables,
    skip: loadingProfilesInRange,
  });
  const { data: entitySchemaData, loading: loadingEntitySchema } = useGetModelSegmentColumnCountsQuery({
    variables: { modelId, tags: segment.tags },
  });

  const countDiscrete =
    (entitySchemaData?.model?.segment?.entitySchema?.inputCounts?.discrete || 0) +
    (entitySchemaData?.model?.segment?.entitySchema?.outputCounts?.discrete || 0);
  const countNonDiscrete =
    (entitySchemaData?.model?.segment?.entitySchema?.inputCounts?.nonDiscrete || 0) +
    (entitySchemaData?.model?.segment?.entitySchema?.outputCounts?.nonDiscrete || 0);
  const totalColumns = countDiscrete + countNonDiscrete;

  const { allAnomalies } = useGetAlertsForSegmentedProfiles(modelId, profiles, segment.tags);
  const memoizedFilterState = useDeepCompareMemo(
    () =>
      // Note that we have to memoize the filter state using deep comparison
      // because it is a POJO, and its reference changes on render.
      filter,
    [filter],
  );
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const handleError = useCallback(
    (apolloError: ApolloError) => {
      apolloError.graphQLErrors.forEach((err) => {
        if (isDashbirdError(err)) handleExceededLimit(err);
        else
          enqueueSnackbar({
            title: 'Something went wrong.',
            variant: 'error',
          });
      });
    },
    [enqueueSnackbar, handleExceededLimit],
  );

  useEffect(() => {
    if (error) {
      handleError(error);
      console.error('Failed to get selected model profiles', error);
    }
  }, [error, handleError]);

  useEffect(() => {
    allAnomalies.forEach((profile) => {
      const anomalies = formatProfilesAnomalies(profile, monitorSchema, entitySchemaData?.model?.batchFrequency);
      if (anomalies) setAnomaliesBatchData((previousState) => [...previousState, ...anomalies]);
    });
  }, [allAnomalies, monitorSchema, entitySchemaData?.model?.batchFrequency]);

  useEffect(() => {
    setSidePanelVisibility(false);
  }, [profiles]);

  useEffect(() => {
    if (pt.pageType !== 'dataProfile') {
      console.error(`Tried to show model feature table on page ${pt.pageType}`);
    }
  }, [pt.pageType]);

  const closeFeaturePanel = useCallback(() => {
    setSidePanelVisibility(false);
    setSidePanelContent([]);
    setTableSelectedRow(-1);
  }, [setTableSelectedRow]);

  useEffect(() => {
    const keyPressHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFeaturePanel();
      }
    };

    document.addEventListener('keydown', keyPressHandler);
    return () => {
      document.removeEventListener('keydown', keyPressHandler);
    };
  }, [closeFeaturePanel]);

  const profilesWithData = useMemo(() => {
    if (!profiles.length || !data?.model) return undefined;
    const { batches, referenceProfiles, individualProfiles: individualData } = data?.model.segment ?? {};
    if (!batches && !referenceProfiles && !individualData) return undefined;

    const batchProfiles: ProfileData[] =
      batches?.map((profile) => ({
        profileId: profile.timestamp,
        sketches: profile.sketches,
      })) ?? [];

    const staticProfileIds: ProfileData[] =
      referenceProfiles
        ?.map((profile) => ({ profileId: profile.id as NumberOrString, sketches: profile.sketches }))
        ?.filter((profile): profile is ProfileData => !!profile.sketches) ?? [];

    const individualProfilesData =
      individualData
        ?.map((profile) => ({ profileId: profile.retrievalToken as NumberOrString, sketches: profile.sketches }))
        ?.filter((profile): profile is ProfileData => !!profile.sketches) ?? [];

    return { batchProfiles, staticProfileIds, individualProfilesData };
  }, [profiles, data]);

  const onReportHide = useCallback(
    (featureHighlight?: string) => {
      // We can't use any of the navigation utils that we made because we need to change two params at once.
      // We also can't pair a custom param change with our util because if you fire two navigation events quickly
      // then one of them will get ignored.
      setSearchParams((nextSearchParams) => {
        nextSearchParams.delete(PROFILE_REPORT);
        if (featureHighlight) {
          nextSearchParams.set(FEATURE_HIGHLIGHT_TAG, featureHighlight || '');
        }
        return nextSearchParams;
      });
    },
    [setSearchParams],
  );

  const onInsightTabShow = useCallback(() => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(PROFILE_REPORT, 'true');
      return nextSearchParams;
    });
  }, [setSearchParams]);

  const isInsightTabActive = pt.profileReport === 'true';

  const renderProfileAnalysisTable = () => {
    if (loadingProfilesInRange) {
      return (
        <div className={classes.noBatchesState}>
          <Skeleton width="100%" height="100%" />
        </div>
      );
    }
    if (noProfilesInRange) {
      return (
        <div className={classes.noBatchesState}>
          <WhyLabsNoDataPage
            maxContentWidth={650}
            title="No batches available in the selected date range"
            subtitle={<p>Set a different time window or use the batch profile lineage widget to set the date range.</p>}
          />
        </div>
      );
    }

    return (
      <ProfilesTable
        setThreeProfilesAutoSelect={setSpecialCase3profilesAutoSelect}
        batchProfilesData={profilesWithData?.batchProfiles ?? []}
        staticProfilesData={profilesWithData?.staticProfileIds ?? []}
        individualProfilesData={profilesWithData?.individualProfilesData ?? []}
        anomaliesBatchData={anomaliesBatchData}
        loading={loading}
        error={!!error}
        onRowClick={(featureData: TableFeatureDataType[]) => {
          setSidePanelVisibility(true);
          setSidePanelContent(featureData);
        }}
        onHideSidePanel={() => {
          if (sidePanelVisibility) setSidePanelVisibility(false);
        }}
      />
    );
  };

  if (loadingEntitySchema)
    return (
      <div className={classes.loadingWrapper}>
        <div className={cx(classes.flexColumn, classes.sidePanelSkeleton)}>
          <Skeleton width={298} height="84px" mb={2} />
          <Skeleton width={298} height="100%" />
        </div>
        <div className={cx(classes.flexColumn, classes.tableSkeleton)}>
          <Skeleton height="84px" mb={2} />
          <Skeleton height="100%" />
        </div>
      </div>
    );

  if (!totalColumns) {
    return <NoDataMessagePage />;
  }

  const profileAnalysisTabChildren = (() => {
    return (
      <div className={classes.profileTabRoot}>
        <div className={classes.profileTabContent}>
          <div className={cx(classes.gridColumn)}>
            <div className={classes.headerRoot}>
              <FeatureCountDiscreteWidget includeOutputs withoutLeftBorder />
              <ProfileLineageWidget />
            </div>
            {renderProfileAnalysisTable()}
          </div>
        </div>
        <ProfilesFeaturePanel
          visible={sidePanelVisibility}
          content={sidePanelContent}
          onCloseSidePanel={closeFeaturePanel}
        />
      </div>
    );
  })();

  const activeTab = (() => {
    if (isInsightTabActive) return INSIGHT_TAB_LABEL;

    return PROFILE_TAB_LABEL;
  })();

  const handleTabChange = (newTab: string) => {
    if (newTab === INSIGHT_TAB_LABEL) {
      onInsightTabShow();
    } else {
      setSearchParams((nextSearchParams) => {
        nextSearchParams.delete(PROFILE_REPORT);
        return nextSearchParams;
      });
    }
  };

  return (
    <div className={classes.root}>
      <div className={cx(classes.flexColumn, classes.sidePanel)}>
        <ModelProfilesSidePanel
          threeProfilesAutoSelect={specialCase3profilesAutoSelect}
          setThreeProfilesAutoSelect={setSpecialCase3profilesAutoSelect}
          modelId={modelId}
          memoizedFilterState={memoizedFilterState}
          setFilter={setFilter}
          loading={loading}
          error={error}
          closeFeaturePanel={closeFeaturePanel}
        />
      </div>
      <WhyLabsControlledTabs
        activeTab={activeTab}
        classNames={{
          root: classes.tabsRoot,
          tabsPanel: classes.tabsPanel,
        }}
        onTabChange={handleTabChange}
        tabs={[
          {
            children: profileAnalysisTabChildren,
            label: PROFILE_TAB_LABEL,
          },
          {
            children: <ResourceInsightsPage onHideReport={onReportHide} />,
            label: INSIGHT_TAB_LABEL,
          },
        ]}
      />
    </div>
  );
}
