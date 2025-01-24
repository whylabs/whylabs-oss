import { HtmlTooltip, Colors } from '@whylabs/observatory-lib';
import { AlertCategory, useGetTotalAlertsByTimeQuery } from 'generated/graphql';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { tooltips } from 'strings/tooltips';
import useTypographyStyles from 'styles/Typography';
import { Skeleton } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { friendlyFormat } from 'utils/numberUtils';
import { useMemo } from 'react';
import BarStackWidget from './BarStackWidget';
import { alertVariants } from '../table/cells/AnomalyTypes';

const OverviewAnomalyCountWidget: React.FC = () => {
  const { classes: styles, cx } = useModelWidgetStyles();
  const { classes: typography } = useTypographyStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();

  const { loading, error, data } = useGetTotalAlertsByTimeQuery({
    variables: {
      ...dateRange,
    },
    skip: loadingDateRange,
  });

  if (error) {
    console.error(error);
  }

  const alerts = useMemo(() => {
    const alertsByCategory: {
      [K in AlertCategory]: number;
    } = {
      // order is important
      Ingestion: 0,
      DataQuality: 0,
      DataDrift: 0,
      Performance: 0,
      Unknown: 0,
    };

    data?.models.forEach((model) => {
      model.anomalyCounts?.totals.forEach((total) => {
        alertsByCategory[total.category] += total.count;
      });
    });
    return alertsByCategory;
  }, [data?.models]);
  const totalLoading = loadingDateRange || loading;
  const totalAlerts = Object.values(alerts).reduce((sum, count) => sum + count, 0);

  const readyToShow = !totalLoading && !!data?.models;

  return (
    <div className={cx(styles.root, styles.overviewAlerts)}>
      <div className={styles.headlineColumn}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, styles.bolded, styles.headline)}>
          Total anomalies
          <HtmlTooltip tooltipContent={tooltips.model_overview_total_anomalies_widget} />
        </WhyLabsText>
        {readyToShow && (
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>
            {friendlyFormat(totalAlerts)}
          </WhyLabsText>
        )}
        {totalLoading && (
          <WhyLabsText className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>
            <Skeleton variant="text" width={84} height={38} animate />
          </WhyLabsText>
        )}
        {error && !totalLoading && (
          <WhyLabsText className={cx(typography.widgetHighlightNumber, styles.heroNumber)}>N/A</WhyLabsText>
        )}
      </div>
      {readyToShow && (
        <div className={styles.column}>
          <BarStackWidget
            counts={Object.values(alerts).slice(0, -1)}
            colors={Colors.alertStackedBarArray}
            labels={alertVariants.map((v) => v.text)}
            keepOrder
          />
        </div>
      )}
      {loading && (
        <div className={styles.skeletonWrap}>
          <div>
            <Skeleton variant="rect" width={70} height={14} animate />
            <Skeleton variant="rect" width={70} height={14} animate />
            <Skeleton variant="rect" width={70} height={14} animate />
            <Skeleton variant="rect" width={70} height={14} animate />
          </div>
          <div>
            <Skeleton variant="rect" width={100} height={14} animate />
            <Skeleton variant="rect" width={100} height={14} animate />
            <Skeleton variant="rect" width={100} height={14} animate />
            <Skeleton variant="rect" width={100} height={14} animate />
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewAnomalyCountWidget;
