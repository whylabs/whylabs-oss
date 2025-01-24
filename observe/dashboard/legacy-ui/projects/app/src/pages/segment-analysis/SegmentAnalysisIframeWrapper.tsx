import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { IFrameContainer } from 'components/iframe/IFrameContainer';
import { createStyles } from '@mantine/core';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { getNewStackEmbeddedURL, NewStackPath } from 'hooks/useNewStackLinkHandler';
import {
  ACTIVE_COMPARISON,
  PRIMARY_METRIC,
  SECONDARY_METRIC,
  SEGMENT_ANALYSIS_KEYS,
  SELECTED_COLUMN_QUERY_NAME,
  SUPER_PICKER_TEMP_PARAMS,
  THRESHOLD_QUERY_NAME,
} from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSearchParams } from 'react-router-dom';
import { MainStackEvents } from 'hooks/useStackCustomEventListeners';
import { Colors } from '@whylabs/observatory-lib';
import { FlexDashCard } from 'components/dashboard-cards/FlexDashCard';
import { arrayOfLength } from 'utils/arrayUtils';
import { SkeletonGroup } from 'components/design-system';
import { useElementSize } from '@mantine/hooks';
import { getParam, usePageTypeWithParams } from '../page-types/usePageType';
import { useSegmentAnalysisViewModel } from './useSegmentAnalysisViewModel';
import { SEGMENT_ANALYSIS_IFRAME } from './utils';
import { isValidNumber } from '../../utils/typeGuards';

const PADDING = 20;
const GRID_GAP = 20;
const CARDS_PADDING = 10;
const SUMMARY_CARD_WIDTH = 200;

const useStyles = createStyles(() => ({
  iframeWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    overflowY: 'auto',
  },
  skeletonContainer: {
    padding: PADDING,
    display: 'flex',
    flexDirection: 'column',
    gap: GRID_GAP,
    width: '100%',
    minHeight: '100%',
    background: Colors.brandSecondary100,
  },
  flexRow: {
    display: 'flex',
    gap: GRID_GAP,
  },
  summaryCardSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  fakeCardsContainer: {
    display: 'flex',
    gap: CARDS_PADDING,
  },
}));

export const SegmentAnalysisIframeWrapper = ({
  pageViewModel,
}: {
  pageViewModel: ReturnType<typeof useSegmentAnalysisViewModel>;
}): ReactElement => {
  const { classes } = useStyles();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const { modelId } = usePageTypeWithParams();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  const hasComparison = searchParams.get(ACTIVE_COMPARISON);
  const { width, ref } = useElementSize();
  const {
    meta: { resourceType },
    metricsData,
  } = pageViewModel;
  const headerState = pageViewModel.getHeaderControlsState(resourceType ?? null, metricsData);
  const { primaryMetric, secondaryMetric, targetColumn, referenceThreshold } = headerState;
  const handleNonPersistedParams = (newSearchParams: URLSearchParams) => {
    const setParam = (params: { key: string; value?: string | null }[]) => {
      params.forEach(({ key, value }) => {
        if (key && value) {
          newSearchParams.set(key, value);
        }
      });
    };
    setParam([
      { key: PRIMARY_METRIC, value: primaryMetric },
      { key: SECONDARY_METRIC, value: secondaryMetric },
      { key: SELECTED_COLUMN_QUERY_NAME, value: targetColumn },
    ]);
  };

  const [usedUrl, setUrl] = useState<string>('');

  const iframeURL = (() => {
    const orgId = getParam(TARGET_ORG_QUERY_NAME);
    if (!orgId || !modelId) return '';
    const path: NewStackPath = `${modelId}/segment-analysis`;
    const iframeSearchParams = new URLSearchParams();
    [...SEGMENT_ANALYSIS_KEYS, ...SUPER_PICKER_TEMP_PARAMS].forEach((p) => {
      const segmentAnalysisParam = searchParams.get(p);
      if (segmentAnalysisParam && p !== THRESHOLD_QUERY_NAME) {
        iframeSearchParams.set(p, segmentAnalysisParam);
      }
    });
    handleNonPersistedParams(iframeSearchParams);

    return getNewStackEmbeddedURL({
      orgId,
      path,
      searchParams: iframeSearchParams,
      datePickerSearchString,
      addBackToParam: false,
    });
  })();

  if (iframeURL !== usedUrl) {
    setUrl(iframeURL);
  }

  /*
   * We can't pass down threshold changes from URL, otherwise the iframe URL will change and cause the page to reload every input/click.
   * This is a problem of using iframe to connect stacks, but we are working around by emitting with CustomEvents on the number input onChange callback
   * */
  const urlWithThreshold = useMemo(() => {
    if (!usedUrl) return '';
    if (!isValidNumber(referenceThreshold)) return usedUrl;
    const concatToken = usedUrl?.includes('?') ? '&' : '?';
    return usedUrl.concat(`${concatToken}${THRESHOLD_QUERY_NAME}=${referenceThreshold}`);
    // don't include thresholdSearchParam as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedUrl]);

  const didLoadEventHandler = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const { page } = customEvent.detail;
    if (page === 'segment-analysis') {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [iframeURL]);

  useEffect(() => {
    window.document.addEventListener(MainStackEvents.LoadingComplete, didLoadEventHandler);
    return () => {
      window.document.removeEventListener(MainStackEvents.LoadingComplete, didLoadEventHandler);
    };
  }, [didLoadEventHandler]);

  const summaryCardLoadingSkeleton = () =>
    arrayOfLength(2).map((i) => (
      <div key={`skeleton-summary-${i}`} className={classes.summaryCardSection}>
        <SkeletonGroup count={1} width="80%" height={16} />
        <SkeletonGroup count={1} width="60%" height={32} mt={4} mb={2} />
        <SkeletonGroup count={2} width="100%" height={14} mt={2} />
      </div>
    ));

  const fakeTimeseriesGraph = () => [
    <SkeletonGroup count={1} width="70%" height={24} />,
    <SkeletonGroup count={1} width="100%" height={180} />,
  ];

  const renderTimeseriesFakeCard = () => {
    const summaryCardsWidth = (CARDS_PADDING + SUMMARY_CARD_WIDTH) * (hasComparison ? 2 : 1);
    const graphAvailableSpace = width - PADDING * 2 - summaryCardsWidth;
    const graphWidth = hasComparison ? (graphAvailableSpace - GRID_GAP) / 2 : graphAvailableSpace;
    return (
      <div className={classes.fakeCardsContainer}>
        <FlexDashCard
          flexDirection="column"
          title="Summary metrics"
          sections={summaryCardLoadingSkeleton()}
          width={SUMMARY_CARD_WIDTH}
          height={275}
        />
        <FlexDashCard
          flexDirection="column"
          title={null}
          sections={fakeTimeseriesGraph()}
          width={graphWidth}
          height={275}
        />
      </div>
    );
  };

  const fakeSegmentedGraphs = () => [
    <div className={classes.summaryCardSection}>
      <SkeletonGroup count={1} width="100%" height={28} mb={4} />
      <SkeletonGroup count={2} width="100%" height={275} mt={2} />
    </div>,
  ];

  const fakeLoadingSkeleton = () => {
    return (
      <div className={classes.skeletonContainer}>
        <div className={classes.flexRow}>
          {renderTimeseriesFakeCard()}
          {hasComparison && renderTimeseriesFakeCard()}
        </div>
        <FlexDashCard flexDirection="column" title={null} sections={fakeSegmentedGraphs()} width="100%" height="auto" />
      </div>
    );
  };

  return (
    <div className={classes.iframeWrapper} ref={ref}>
      <IFrameContainer
        id={SEGMENT_ANALYSIS_IFRAME}
        height="100%"
        width="100%"
        title="Segment Analysis"
        url={urlWithThreshold}
        loadingComponent={fakeLoadingSkeleton()}
        loading={isLoading}
      />
    </div>
  );
};
