import { yearMonthDay } from 'utils/dateUtils';

import { WhyLabsTooltip, WhyLabsText } from 'components/design-system';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { CardResourceSortableFieldProps } from '../../layoutHelpers';

export const CardResourceFreshness: React.FC<CardResourceSortableFieldProps> = ({
  model,
  fieldSortKey,
  appliedSortKey,
  sortTooltip,
}) => {
  const { classes, cx } = useCardLayoutStyles();
  const activeSorting = fieldSortKey === appliedSortKey;
  const timestamp = model?.dataAvailability?.latestTimestamp;
  return (
    <WhyLabsTooltip label={activeSorting ? sortTooltip : ''}>
      <WhyLabsText className={classes.cardSubTitle}>Freshness</WhyLabsText>
      <WhyLabsText className={cx(classes.cardText, timestamp ? '' : classes.cardNoData)}>
        {timestamp ? yearMonthDay(timestamp) : 'No profiles found'}
      </WhyLabsText>
    </WhyLabsTooltip>
  );
};
