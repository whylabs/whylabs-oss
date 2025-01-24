import { useMemo } from 'react';
import { Skeleton } from '@mantine/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { tooltips } from 'strings/tooltips';
import useTypographyStyles from 'styles/Typography';
import { AlertCategory, useGetSegmentAlertCountQuery } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { WhyLabsText } from 'components/design-system';
import BarStackWidget from '../BarStackWidget';

type AlertsByCategory = { [key in AlertCategory]?: number };

export default function SegmentAlertCountWidget(): JSX.Element {
  const { classes: styles, cx } = useModelWidgetStyles();
  const pt = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const {
    data: allData,
    loading,
    error,
  } = useGetSegmentAlertCountQuery({
    variables: {
      ...dateRange,
      model: pt.modelId,
      tags: pt.segment.tags,
    },
    skip: loadingDateRange,
  });

  const [alertTotalsByCategory, totalAlertCount] = useMemo(() => {
    const counts = allData?.model?.segment?.anomalyCounts?.totals ?? [];
    return counts.reduce(
      ([categoryMap, sum], count) => {
        const currentCount = categoryMap[count.category] ?? 0;
        return [{ ...categoryMap, [count.category]: currentCount + count.count }, sum + count.count];
      },
      [{} as AlertsByCategory, 0],
    );
  }, [allData]);

  const { classes: typography } = useTypographyStyles();

  if (error) {
    console.error(`SegmentAlertCountWidget component error: ${error}`);
  }
  const readyToShow = !(loading || error);

  return (
    <div className={styles.root}>
      <div className={styles.headlineColumn}>
        <WhyLabsText inherit className={cx(styles.bolded, styles.headline)}>
          Total segment anomalies
          <HtmlTooltip tooltipContent={tooltips.model_feature_page_total_alerts} />
        </WhyLabsText>
        {readyToShow && (
          <WhyLabsText
            inherit
            className={cx(typography.widgetHighlightNumber, styles.heroNumber)}
          >{`${totalAlertCount}`}</WhyLabsText>
        )}
        {loading && <Skeleton radius={4} width={84} height={38} animate />}
      </div>
      {readyToShow && (
        <div className={styles.column}>
          <BarStackWidget
            counts={[
              alertTotalsByCategory.Ingestion ?? 0,
              alertTotalsByCategory.DataQuality ?? 0,
              alertTotalsByCategory.DataDrift ?? 0,
              alertTotalsByCategory.Performance ?? 0,
            ]}
            colors={[Colors.chartAqua, Colors.chartPrimary, Colors.chartOrange, Colors.chartYellow]}
            labels={['Integration health', 'Data quality', 'Drift', 'Model performance']}
            keepOrder
          />
        </div>
      )}
      {loading && (
        <div className={styles.skeletonWrap}>
          <div>
            <Skeleton radius={4} width={70} height={14} animate />
            <Skeleton radius={4} width={70} height={14} animate />
            <Skeleton radius={4} width={70} height={14} animate />
            <Skeleton radius={4} width={70} height={14} animate />
          </div>
          <div>
            <Skeleton radius={4} width={100} height={14} animate />
            <Skeleton radius={4} width={100} height={14} animate />
            <Skeleton radius={4} width={100} height={14} animate />
            <Skeleton radius={4} width={100} height={14} animate />
          </div>
        </div>
      )}
    </div>
  );
}
