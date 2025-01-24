import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FullSketchFieldsFragment,
  FrequentItemUnitFieldsFragment,
  useGetLatestTimestampQuery,
  useGetSegmentLatestTimestampQuery,
  SortDirection,
  FeatureType,
} from 'generated/graphql';
import { Colors, TableLoading } from '@whylabs/observatory-lib';
import { useRecoilState } from 'recoil';
import { Chip } from '@material-ui/core';
import { NumberOrString } from 'utils/queryUtils';
import { tableSelectedRowAtom } from 'atoms/profilesTableAtom';
import useTypographyStyles from 'styles/Typography';
import { getUrlProfilesRange } from 'pages/resource-overview-page/components/TableDashboard/DashboardTable/DashboardTable';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSearchProfiles } from 'hooks/useSearchProfiles';
import { INDIVIDUAL_SEPARATOR } from 'types/navTags';
import { WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import useProfilesTableCSS from './useProfilesTableCSS';
import { useUnifiedBins } from './hooks/useUnifiedBins';
import { FeatureAnomaliesBatchData, ProfileData, TableFeatureDataType } from './types';
import ProfileTableView from './ProfileTableView';

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

export type ProfilesTableProps = {
  batchProfilesData: ProfileData[];
  staticProfilesData: ProfileData[];
  individualProfilesData: ProfileData[];
  error: boolean;
  loading: boolean;
  onRowClick: (featureData: TableFeatureDataType[]) => void;
  onHideSidePanel: () => void;
  anomaliesBatchData?: FeatureAnomaliesBatchData[];
  segment?: ParsedSegment;
  setThreeProfilesAutoSelect: (isTrue: boolean) => void;
};

const CHIP_CHARACTER_LIMIT = 28;

// Sort so most common is first
const sortFrequentItemsByCount = (items: FrequentItemUnitFieldsFragment[]): FrequentItemUnitFieldsFragment[] =>
  [...items].sort((a, b) => (b.estimate ?? 0) - (a.estimate ?? 0));

const sortFrequentItemsByNumericValue = (items: FrequentItemUnitFieldsFragment[]): FrequentItemUnitFieldsFragment[] =>
  [...items].sort((a, b) => (Number(b.value) ?? 0) - (Number(a.value) ?? 0));

const sortFrequentItemsAlphabetically = (items: FrequentItemUnitFieldsFragment[]): FrequentItemUnitFieldsFragment[] =>
  [...items].sort((a, b) => (a.value ?? '').localeCompare(b.value ?? ''));

export default function ProfilesTable({
  batchProfilesData,
  staticProfilesData,
  individualProfilesData,
  loading,
  error,
  onRowClick,
  onHideSidePanel,
  segment,
  setThreeProfilesAutoSelect,
  anomaliesBatchData,
}: ProfilesTableProps): JSX.Element {
  const { classes: styles, cx } = useProfilesTableCSS();
  const { classes: typography } = useTypographyStyles();
  const { modelId } = usePageTypeWithParams();
  const [, setTableSelectedRow] = useRecoilState<number>(tableSelectedRowAtom);
  const [tableData, setTableData] = useState<{ [key: string]: TableFeatureDataType[] }>({});
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.Asc);
  const { rawProfiles } = useSearchProfiles();
  const profilesList: ProfileData[] = useMemo(() => {
    const allSelectedProfiles = [...individualProfilesData, ...batchProfilesData, ...staticProfilesData];
    const profilesMap = new Map<NumberOrString, ProfileData | undefined>(); // Using Map since it keeps order of insertions.

    // Creates Map so that order of profiles is identical as in URL query params...
    rawProfiles.forEach((rawProfile) => {
      const profileData = allSelectedProfiles.find((selectedProfile) => {
        if (rawProfile.toString().includes(INDIVIDUAL_SEPARATOR)) {
          const retrievalToken = rawProfile.toString().split(INDIVIDUAL_SEPARATOR)[1];
          return retrievalToken === selectedProfile.profileId.toString();
        }
        return selectedProfile.profileId === rawProfile;
      });
      profilesMap.set(rawProfile, profileData);
    });

    // Collects values from profiles map
    const data = Array.from(profilesMap.values()).filter((profile): profile is ProfileData => !!profile); // Filtering because of type compability.

    return data;
  }, [batchProfilesData, individualProfilesData, rawProfiles, staticProfilesData]);

  const { profilesWithUnifiedHistograms, loading: unifiedBinsLoading } = useUnifiedBins({
    profilesData: profilesList,
    modelId,
  });

  const { setDatePickerRange } = useSuperGlobalDateRange();
  const { data: dataLatestTimestamp } = useGetLatestTimestampQuery({ variables: { modelId } });
  const { data: segmentDataLatestTimestamp } = useGetSegmentLatestTimestampQuery({
    variables: { modelId, tags: segment?.tags },
    skip: !modelId,
  });
  const latestTimestamp = segment
    ? segmentDataLatestTimestamp?.model?.segment?.dataAvailability?.latestTimestamp
    : dataLatestTimestamp?.model?.dataAvailability?.latestTimestamp;
  const oldestTimestamp = segment
    ? segmentDataLatestTimestamp?.model?.segment?.dataAvailability?.oldestTimestamp
    : dataLatestTimestamp?.model?.dataAvailability?.oldestTimestamp;

  let displayLink: string[] = [];
  if (latestTimestamp && oldestTimestamp) {
    displayLink = getUrlProfilesRange(oldestTimestamp, latestTimestamp)!;
  }

  function transformValue(value: number | string | null | undefined) {
    if (value !== 0 && !value) {
      return '-';
    }
    const regExp = /^-?\d+\.?\d*$/;
    if (typeof value === 'number' || regExp.test(value)) {
      const num = Number(value);
      if (Number.isSafeInteger(num)) {
        return num.toString();
      }
      return Number(value).toFixed(2);
    }
    return value;
  }

  const clearDuplicates = useCallback(
    (sketch: FullSketchFieldsFragment[] | undefined): FullSketchFieldsFragment[] | undefined => {
      if (!sketch) return undefined;

      const uniqueFeatures: { [key: string]: FullSketchFieldsFragment } = {};
      sketch.forEach((feature) => {
        if (uniqueFeatures[feature.featureName])
          console.log(`Found duplicate feature ${feature.featureName}, model ${modelId}`, feature);

        uniqueFeatures[feature.featureName] = { ...feature };
      });

      return Object.values(uniqueFeatures);
    },
    [modelId],
  );

  const truncateList = useCallback((frequentItems: FrequentItemUnitFieldsFragment[]) => {
    const topFive = sortFrequentItemsByCount(frequentItems).slice(0, 5);
    let runningTotal = 0;
    let index = 0;
    const truncatedList: FrequentItemUnitFieldsFragment[] = [];
    let didTruncate = false;
    while (runningTotal < CHIP_CHARACTER_LIMIT && index < topFive.length) {
      const nextText = transformValue(topFive[index].value);
      // add 2 additional "space characters" per pill to account for the edges
      runningTotal += nextText.length + 2;
      if (runningTotal < CHIP_CHARACTER_LIMIT) {
        truncatedList.push(topFive[index]);
      } else {
        didTruncate = true;
      }
      index += 1;
    }
    return [truncatedList, didTruncate] as const;
  }, []);

  function getMedian(feature: FullSketchFieldsFragment) {
    return feature?.numberSummary?.quantiles.bins.reduce((acc: number | undefined, curr, index) => {
      if (!feature?.numberSummary?.quantiles.counts) return acc;

      if (Math.abs(curr - 0.5) < 0.001 && feature.numberSummary.quantiles.counts.length > index)
        return feature?.numberSummary?.quantiles.counts[index];

      return acc;
    }, undefined);
  }

  // TODO: Re-structure this function, it looks very confusing
  function mapChartData(feature: FullSketchFieldsFragment, counts: number[] | undefined) {
    let mappedChartData;

    if (feature.showAsDiscrete) {
      mappedChartData = feature.frequentItems.map((frequentItem, frequentItemIndex) => ({
        axisY: frequentItem.estimate as number,
        axisX: frequentItemIndex,
        // axisX: frequentItem.value,
      }));
    } else {
      mappedChartData = counts?.length
        ? counts.map((countData, countIndex) => ({
            axisY: countData,
            axisX: countIndex,
            // axisX: bins ? (bins[countIndex] || 0) : 0,
          }))
        : [];
    }

    return mappedChartData;
  }

  const mapFrequentItems = useCallback(
    (feature: FullSketchFieldsFragment) => {
      let mappedFrequentItems: '-' | JSX.Element[] = '-';

      if (feature.frequentItems.length) {
        const [items, didTruncate] = truncateList(feature.frequentItems);
        mappedFrequentItems = items.map((item) => (
          <Chip
            key={`frequent-item-${item.value}`}
            className={styles.frequentItem}
            variant="outlined"
            size="small"
            label={transformValue(item.value)}
          />
        ));
        if (didTruncate) {
          mappedFrequentItems.push(
            <Chip
              key="frequent-items-ellipsis"
              className={styles.frequentItem}
              variant="outlined"
              size="small"
              label="..."
            />,
          );
        }
      }

      return mappedFrequentItems;
    },
    [styles.frequentItem, truncateList],
  );

  /**
   * Responsible for creating accurate feature map
   */
  const createFeaturesMap = useCallback(
    (profiles: ProfileData[]) => {
      const featuresDataMap: { [key: string]: TableFeatureDataType[] } = {};

      profiles.forEach((profile: ProfileData) => {
        const features = clearDuplicates(profile.sketches.results);
        if (!features) return;

        features.forEach((feature) => {
          featuresDataMap[feature.featureName] = new Array(profiles.length).fill(undefined);
        });
      });

      return featuresDataMap;
    },
    [clearDuplicates],
  );

  const mapProfilesToTableData = useCallback(
    (profiles: ProfileData[]) => {
      if (!profiles?.length) return;
      const featuresDataMap = createFeaturesMap(profiles);

      profiles.forEach((profile: ProfileData, profileIndex: number) => {
        const features = clearDuplicates(profile.sketches.results);
        const unifiedHistogramsList = profilesWithUnifiedHistograms && profilesWithUnifiedHistograms[profileIndex];
        if (!features) return;
        features.forEach((feature: FullSketchFieldsFragment) => {
          const dataType = feature.schemaSummary?.inference?.type;
          // don't rely on potentially arbitrary backend order
          const sortedFrequentItems =
            dataType && [FeatureType.Integer, FeatureType.Fraction].includes(dataType)
              ? sortFrequentItemsByNumericValue(feature.frequentItems)
              : sortFrequentItemsAlphabetically(feature.frequentItems);
          const counts = feature?.numberSummary?.histogram?.counts;
          const median = getMedian(feature);
          const transformedMedian = transformValue(median);
          const mappedChartData = mapChartData(feature, counts);
          const mappedFrequentItems = mapFrequentItems(feature);
          const resultAnomalies = anomaliesBatchData?.filter(
            (an) => an.batchTimestamp === feature.datasetTimestamp && an.featureName === feature.featureName,
          );

          const mappedResult: TableFeatureDataType = {
            chartData: mappedChartData,
            profileId: profile.profileId,
            numberSummary: feature.numberSummary || null,
            'feature-name': feature.featureName,
            'frequent-items': mappedFrequentItems,
            'inferred-discretion': feature.showAsDiscrete ? 'Discrete' : 'Non-discrete',
            'total-count': transformValue(feature.totalCount),
            'null-fraction': transformValue(feature.nullRatio),
            'est-unique-val': transformValue(feature.uniqueCount?.estimate),
            'data-type': feature.schemaSummary?.inference?.type,
            'data-type-count': transformValue(feature.schemaSummary?.inference?.count),
            mean: transformValue(feature.numberSummary?.mean),
            'standard-deviation': transformValue(feature.numberSummary?.stddev),
            min: transformValue(feature.numberSummary?.min),
            median: transformedMedian,
            max: transformValue(feature.numberSummary?.max),
            profileColor: Colors.profilesColorPool[profileIndex],
            frequentItemsRaw: sortedFrequentItems,
            timestamp: feature.datasetTimestamp ?? 0,
            alerts: resultAnomalies ?? [],
            featurePanelData: {
              frequentItems: sortedFrequentItems, // really this should be a unified list
              histogram: feature.numberSummary ? feature.numberSummary.histogram : null,
              unifiedHistograms: unifiedHistogramsList,
            },
          };

          featuresDataMap[feature.featureName][profileIndex] = mappedResult;
        });
      });

      setTableData(featuresDataMap);
    },
    [profilesWithUnifiedHistograms, createFeaturesMap, mapFrequentItems, clearDuplicates, anomaliesBatchData],
  );

  useEffect(() => {
    if (profilesList?.length) mapProfilesToTableData(profilesList);
  }, [profilesList, mapProfilesToTableData]);

  const toggleSort = () => {
    onHideSidePanel();
    setTableSelectedRow(-1);
    setSortDirection((prevSort) => {
      if (prevSort === SortDirection.Asc) return SortDirection.Desc;

      return SortDirection.Asc;
    });
  };

  function renderError() {
    console.error('Error looking up alert data', error);
    return (
      <div className={cx(styles.root, styles.rootCenteredText)}>
        <WhyLabsText inherit>Error loading data</WhyLabsText>
      </div>
    );
  }

  function renderNothingChosen() {
    return (
      <>
        {profilesList.length && (
          <div className={styles.root}>
            <TableLoading />
          </div>
        )}
        {segment && !loading && !profilesList.length && (
          <div className={cx(styles.root, styles.rootCenteredText)}>
            <WhyLabsText inherit>No data to show for the selected range. </WhyLabsText>
          </div>
        )}
        {!segment && !loading && !profilesList.length && (
          <div className={cx(styles.root, styles.rootCenteredText)}>
            <WhyLabsText inherit>
              No data to show for the selected range. The profile lineage for this model is:{' '}
              <button
                type="button"
                onClick={() => {
                  setDatePickerRange({
                    from: oldestTimestamp ?? 0,
                    to: latestTimestamp ?? 0,
                  });
                  setThreeProfilesAutoSelect(true);
                }}
                className={cx(typography.link, styles.buttonLink)}
              >{`${displayLink[0] ? displayLink[0] : 'Loading...'} to ${
                displayLink[1] ? displayLink[1] : 'Loading...'
              }`}</button>
            </WhyLabsText>
          </div>
        )}
      </>
    );
  }

  /**
   * This is temporary solution
   *
   * TODO:
   *  This function does not take staticProfiles into considerataion.
   *  We can't take total count from batch profiles and add it up with static profiles total count
   *  since they have overlaping features.
   */
  function getRowCount() {
    if (batchProfilesData && batchProfilesData[0]) return batchProfilesData[0].sketches.totalCount;
    if (staticProfilesData && staticProfilesData[0]) return staticProfilesData[0].sketches.totalCount;

    return 0;
  }

  function renderTable(profiles: ProfileData[]) {
    return (
      <div className={styles.root}>
        <ProfileTableView
          unifiedBinsLoading={unifiedBinsLoading}
          showUnifiedBins
          features={tableData}
          numOfProfiles={profiles.length}
          sortedKeys={getSortedKeys()}
          onRowClick={onRowClick}
          sortDirection={sortDirection}
          toggleSort={toggleSort}
        />

        <Pagination loading={loading} rowCount={getRowCount()} renderingOutsideTable withBorder={false} />
      </div>
    );
  }
  const handleRenderingTable = () => {
    if (loading)
      return (
        <div className={styles.root}>
          <TableLoading />
        </div>
      );

    if (error) return renderError();
    if (profilesList) return renderTable(profilesList);

    return renderNothingChosen();
  };

  return handleRenderingTable();

  function getSortedKeys() {
    return Object.keys(tableData).sort((a, b) => {
      if (sortDirection === SortDirection.Desc) {
        return b.localeCompare(a);
      }

      return a.localeCompare(b);
    });
  }
}
