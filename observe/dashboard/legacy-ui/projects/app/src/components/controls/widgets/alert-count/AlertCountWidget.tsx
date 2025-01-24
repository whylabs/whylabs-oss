import { Skeleton } from '@mantine/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { SegmentTag, useGetAnomalyCountsForWidgetQuery } from 'generated/graphql';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { useMemo } from 'react';
import useTypographyStyles from 'styles/Typography';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';

import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { createCommonTexts } from 'strings/commonTexts';
import { WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { friendlyFormat } from 'utils/numberUtils';
import { getAlertsData } from './getAlertsData';
import BarStackWidget from '../BarStackWidget';

const COMMON_TEXTS = createCommonTexts({
  allSegmentAnomalies: 'Total anomalies',
});

const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    totalAnomalies: 'Total overall dataset anomalies',
    totalDatasetAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall dataset, over the active date range. See the segments tab for segment anomalies.',
    totalAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall dataset and all segments, over the active date range.',
  },
  MODEL: {
    ...COMMON_TEXTS,
    totalAnomalies: 'Total overall model anomalies',
    totalDatasetAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall model, over the active date range. See the segments tab for segment anomalies.',
    totalAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall model and all segments, over the active date range.',
  },
  LLM: {
    ...COMMON_TEXTS,
    totalAnomalies: 'Total overall model anomalies',
    totalDatasetAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall model, over the active date range. See the segments tab for segment anomalies.',
    totalAnomaliesTooltip:
      'The total number of anomalies for all monitors on the overall model and all segments, over the active date range.',
  },
};

type AlertCountWidgetProps = {
  analyzerIds?: string[]; // monitor IDs to filter anomalies by
  includeAllSegments?: boolean; // if true, all anomalies will be fetched, across all segments
};

const AlertCountWidget: React.FC<AlertCountWidgetProps> = ({ analyzerIds, includeAllSegments }) => {
  const { classes: styles, cx } = useModelWidgetStyles();
  const { resourceTexts, isDataCategory } = useResourceText(FILE_TEXTS);
  const { classes: typography } = useTypographyStyles();
  const pt = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();

  const tagsFilter: SegmentTag[] | null = includeAllSegments ? null : []; // no segment filter on this page yet

  const { loading, error, data } = useGetAnomalyCountsForWidgetQuery({
    variables: {
      datasetId: pt.modelId ?? '',
      tags: tagsFilter,
      analyzerIds,
      ...dateRange,
    },
    skip: loadingDateRange,
  });

  if (error) {
    console.error(`AlertCountWidget component error: ${error}`);
  }

  const { alertCounts, alertLabels, totalAlerts } = useMemo(
    () =>
      getAlertsData({
        data: data?.anomalyCounts?.totals ?? [],
        isDataCategory,
      }),
    [data, isDataCategory],
  );

  const readyToShow = !(loading || error);

  return (
    <div className={styles.root}>
      <div className={styles.headlineColumn}>
        <WhyLabsText inherit className={cx(styles.bolded, styles.headline)}>
          {includeAllSegments ? resourceTexts.allSegmentAnomalies : resourceTexts.totalAnomalies}
          <HtmlTooltip
            tooltipContent={
              includeAllSegments ? resourceTexts.totalAnomaliesTooltip : resourceTexts.totalDatasetAnomaliesTooltip
            }
          />
        </WhyLabsText>
        {readyToShow && (
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>
            {friendlyFormat(totalAlerts, 3)}
          </WhyLabsText>
        )}
        {loading && (
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>
            <Skeleton variant="text" width={84} height={38} animate />
          </WhyLabsText>
        )}
      </div>
      {readyToShow && (
        <div className={styles.column}>
          <BarStackWidget counts={alertCounts} colors={Colors.alertStackedBarArray} labels={alertLabels} keepOrder />
        </div>
      )}
      {loading && (
        <div className={styles.skeletonWrap}>
          {renderSkeletonBox(70)}
          {renderSkeletonBox(100)}
        </div>
      )}
    </div>
  );

  function renderSkeletonBox(width: number) {
    const renderSkeleton = () => {
      return <Skeleton variant="rect" width={width} height={14} animate />;
    };

    return (
      <div>
        {renderSkeleton()}
        {renderSkeleton()}
        {renderSkeleton()}
        {renderSkeleton()}
      </div>
    );
  }
};

export default AlertCountWidget;
