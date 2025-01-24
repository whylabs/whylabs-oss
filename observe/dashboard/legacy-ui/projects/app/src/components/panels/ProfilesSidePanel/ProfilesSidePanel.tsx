import { useContext, useEffect, useMemo, useRef } from 'react';
import { useResizeObserver } from '@mantine/hooks';
import { useSearchHighlight } from 'hooks/useSearchHighlight';
import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsAccordion, WhyLabsLinkButton } from 'components/design-system';
import { mountIndividualProfileTimeseriesDashboardUrl } from 'hooks/useNewStackLinkHandler';
import { ProfilesPageContext } from 'pages/model-page/context/ProfilesPageContext';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { isString } from 'utils/typeGuards';
import isEqual from 'lodash/isEqual';
import { useUserContext } from 'hooks/useUserContext';
import { useProfileSidePanelStyles } from './ProfileSidePanelCSS';
import { useProfilesListQuery } from './hooks/useProfilesListQuery';
import { ProfilesCollapsible } from './components/panel-collapsibles/ProfilesCollapsible';
import useLoadMoreFeatures from './hooks/useLoadMoreFeatures';
import { ColumnsListCollapsible } from './components/panel-collapsibles/ColumnsListCollapsible';

const COMPONENT_TEXTS = {
  DATA: {},
  MODEL: {},
  LLM: {},
};

export interface ProfileSidePanelProps {
  onSetFilter: (filterText: string) => void;
  readonly sidePanelType?: 'model' | 'segment';
  readonly profileQueryLoading: boolean;
  threeProfilesAutoSelect: boolean;
  setThreeProfilesAutoSelect: (isTrue: boolean) => void;
  closeFeaturePanel: () => void;
  /**
   * The timestamps of profiles that exist for the current time range and model/segment.
   * This can be found in the model/segment.batches field in queries.
   */
}

export default function ProfilesSidePanel({
  onSetFilter,
  profileQueryLoading,
  threeProfilesAutoSelect,
  setThreeProfilesAutoSelect,
  closeFeaturePanel,
}: ProfileSidePanelProps): JSX.Element {
  const { classes: styles } = useProfileSidePanelStyles();
  const { isModelCategory, isDataTransform } = useResourceText(COMPONENT_TEXTS);
  const { userState } = useUserContext();
  const [, dispatchSidePanel] = useContext(ProfilesPageContext);
  const { modelId, segment } = usePageTypeWithParams();
  const { dateRange, dateRangeWithOneDayMinimumInterval, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const [ref, { height }] = useResizeObserver<HTMLDivElement>();

  const { data, loading: profilesLoading } = useProfilesListQuery({
    modelId,
    segment,
    dateRange: dateRangeWithOneDayMinimumInterval,
    skip: loadingDateRange,
  });

  const {
    featureList,
    outputList,
    hasMoreFeatures,
    loadMoreFeaturesHandler,
    hasMoreOutputs,
    loadMoreOutputsHandler,
    loading,
    reset,
  } = useLoadMoreFeatures(modelId, segment?.tags);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [modelId, reset]);

  const totalLoading = loading || profilesLoading || profileQueryLoading;
  const profileQueryData = useMemo(() => data?.batches ?? [], [data?.batches]);
  const staticProfiles = data?.referenceProfiles;
  const { profiles, setProfiles } = useSearchProfiles();
  const [featureHighlight] = useSearchHighlight();
  const firstLoad = useRef(true);
  const autoSelect = useRef(false);

  useEffect(() => {
    // The first time that profile query data is nonempty, check whether or not
    // we should select a profile. Using the reference to verify that this check
    // is only made once.
    const profileNotSelected = profiles.length === 0;

    // Attempt to autoselect profile on first visit.
    if (!autoSelect.current && profileQueryData.length > 0 && !threeProfilesAutoSelect) {
      autoSelect.current = true;
      if (profileNotSelected) setProfiles([profileQueryData[0].timestamp]);
    } else if (!autoSelect.current && staticProfiles?.length && !threeProfilesAutoSelect) {
      autoSelect.current = true;
      if (profileNotSelected) {
        setProfiles([staticProfiles[0].id]);
      }
    }

    // Attempt to select up to three profiles
    if (threeProfilesAutoSelect && profileQueryData.length > 0) {
      const profilesList = profileQueryData.slice(0, 3).map((profile) => profile.timestamp);

      setProfiles(profilesList);
      setThreeProfilesAutoSelect(false);
    }
  }, [profileQueryData, staticProfiles, profiles, setProfiles, threeProfilesAutoSelect, setThreeProfilesAutoSelect]);

  useEffect(() => {
    const { from, to } = dateRange;
    const selectedProfilesInRange = profiles.filter(
      (profile) => isString(profile) || (profile >= from && profile < to),
    );
    if (!!profileQueryData.length && !selectedProfilesInRange.length) {
      autoSelect.current = false;
    }
    if (!!profileQueryData.length && !isEqual(profiles, selectedProfilesInRange)) {
      setProfiles(selectedProfilesInRange);
    }
  }, [dateRange, profileQueryData.length, profiles, setProfiles]);

  useEffect(() => {
    if (featureHighlight && firstLoad.current) {
      // We don't want to prevent future updates or typing-based filter changes
      onSetFilter(featureHighlight);
    }

    if (firstLoad.current) {
      firstLoad.current = false;
    }
  }, [featureHighlight, onSetFilter]);

  /**
   * Creates select inputs
   */
  useEffect(() => {
    const tempSelectionInputs = profiles.map((profile) => ({
      id: profile,
    }));

    // Ensures that we have at least one select input
    dispatchSidePanel({
      selectionInputs: tempSelectionInputs.length > 0 ? tempSelectionInputs : [{ id: new Date().valueOf() }],
    });
  }, [dispatchSidePanel, profiles]);

  const timeseriesUrl = useMemo(() => {
    const orgId = userState.user?.organization?.id ?? '';
    return (
      mountIndividualProfileTimeseriesDashboardUrl({
        resourceId: modelId,
        backToUrl: window.location.href,
        datePickerSearchString,
        orgId,
      }) ?? ''
    );
  }, [datePickerSearchString, modelId, userState.user?.organization?.id]);

  const allowNewStack = false;
  return (
    <div className={styles.collapsibleRoot} ref={ref}>
      <div className={styles.collapsibleWrap} style={{ height: height - 10 }}>
        <WhyLabsAccordion.Root defaultValue="profiles">
          <ProfilesCollapsible closeFeaturePanel={closeFeaturePanel} loading={profileQueryLoading} />
          {allowNewStack && (
            <>
              <div className={styles.timeseriesButtonContainer}>
                <WhyLabsLinkButton
                  href={timeseriesUrl}
                  variant="filled"
                  color="gray"
                  width="full"
                  className={styles.timeseriesButton}
                >
                  Open time series dashboard
                </WhyLabsLinkButton>
              </div>
              <div className={styles.divider} />
            </>
          )}
          <ColumnsListCollapsible
            columnsList={featureList}
            type="features"
            loading={totalLoading}
            allowLoadMore={hasMoreFeatures}
            loadMoreHandler={loadMoreFeaturesHandler}
          />
          {(isModelCategory || isDataTransform) && outputList.length > 0 && (
            <ColumnsListCollapsible
              columnsList={outputList}
              type="outputs"
              loading={totalLoading}
              allowLoadMore={hasMoreOutputs}
              loadMoreHandler={loadMoreOutputsHandler}
            />
          )}
        </WhyLabsAccordion.Root>
      </div>
    </div>
  );
}
