import { timeLong } from 'utils/dateUtils';
import { TextCell } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsTooltip } from 'components/design-system';
import { AlertTableCell } from './types';

interface AlertTimestampCellProps extends AlertTableCell {
  timestamp: number;
  creationTimestamp: number;
}

export default function AlertTimestampCell({
  timestamp,
  creationTimestamp,
  isUnhelpful,
}: AlertTimestampCellProps): JSX.Element {
  const { classes: typography, cx } = useTypographyStyles();

  return (
    <TextCell className={cx(typography.textTable, isUnhelpful ? typography.unhelpfulAlertText : undefined)}>
      <WhyLabsTooltip
        label={`Batch timestamp: ${timeLong(timestamp)}. Created on: ${timeLong(creationTimestamp)}`}
        position="bottom-start"
      >
        {timeLong(timestamp)}
      </WhyLabsTooltip>
    </TextCell>
  );
}
