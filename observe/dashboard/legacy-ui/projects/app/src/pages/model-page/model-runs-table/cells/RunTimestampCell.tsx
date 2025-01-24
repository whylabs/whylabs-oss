import { timeLong } from 'utils/dateUtils';
import { TextCell } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';

interface RunTimestampCellProps {
  timestamp: number;
}

export default function RunTimestampCell({ timestamp }: RunTimestampCellProps): JSX.Element {
  const { classes: typography } = useTypographyStyles();

  return <TextCell className={typography.textTable}>{timeLong(timestamp)}</TextCell>;
}
