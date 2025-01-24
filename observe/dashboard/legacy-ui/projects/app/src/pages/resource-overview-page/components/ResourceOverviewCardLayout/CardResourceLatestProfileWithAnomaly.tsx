import { timeLong } from 'utils/dateUtils';

import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { CardResourceSortableFieldProps } from '../../layoutHelpers';

export const CardResourceLatestProfileWithAnomaly: React.FC<CardResourceSortableFieldProps> = ({
  model,
  fieldSortKey,
  appliedSortKey,
  sortTooltip,
}) => {
  const { classes, cx } = useCardLayoutStyles();
  const activeSorting = fieldSortKey === appliedSortKey;
  const lastestAnomalyTimestamp = model?.latestAnomalyTimestamp ?? 0;
  return (
    <WhyLabsTooltip label={activeSorting ? sortTooltip : ''}>
      <WhyLabsText className={classes.cardSubTitle}>Last profile with anomalies</WhyLabsText>
      <WhyLabsText className={cx(classes.cardText, lastestAnomalyTimestamp ? '' : classes.cardNoData)}>
        {lastestAnomalyTimestamp ? timeLong(lastestAnomalyTimestamp) : 'No anomalies in lineage'}
      </WhyLabsText>
    </WhyLabsTooltip>
  );
};
