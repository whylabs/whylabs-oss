import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import AnomaliesInRangeCell from 'components/controls/widgets/alerts-table/cells/AnomaliesInRangeCell';
import { OverviewTimeSeriesFragment } from 'generated/graphql';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { CardResourceSortableFieldProps } from '../../layoutHelpers';

interface CardResourceAnomaliesInRangeProps extends CardResourceSortableFieldProps {
  timeseries: OverviewTimeSeriesFragment[];
}

export const CardResourceAnomaliesInRange: React.FC<CardResourceAnomaliesInRangeProps> = ({
  model,
  fieldSortKey,
  appliedSortKey,
  sortTooltip,
  timeseries,
}) => {
  const { classes, cx } = useCardLayoutStyles();
  const activeSorting = fieldSortKey === appliedSortKey;
  return (
    <WhyLabsTooltip label={activeSorting ? sortTooltip : ''} position="top">
      <WhyLabsText className={classes.cardSubTitle}>Anomalies in range</WhyLabsText>
      <AnomaliesInRangeCell
        resourceId={model.id}
        noDataText={
          <WhyLabsText className={cx(classes.cardText, classes.cardNoData)}>No anomalies in range</WhyLabsText>
        }
        timeSeries={timeseries}
        viewMode="card"
      />
    </WhyLabsTooltip>
  );
};
