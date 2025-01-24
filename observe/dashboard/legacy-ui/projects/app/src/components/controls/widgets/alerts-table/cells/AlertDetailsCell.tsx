import useTypographyStyles from 'styles/Typography';
import { Chip } from '@material-ui/core';
import { AlertTableCell } from './types';

interface AlertDetailsCellProps extends AlertTableCell {
  text: string;
  showUnhelpfulChip?: boolean;
}

export default function AlertDetailsCell({
  text,
  isUnhelpful,
  showUnhelpfulChip = true,
}: AlertDetailsCellProps): JSX.Element {
  const { classes: typography, cx } = useTypographyStyles();

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {isUnhelpful && showUnhelpfulChip && <Chip className={typography.thinLabel} label="Unhelpful alert" />}
      <span
        className={cx(typography.textTable, isUnhelpful && typography.unhelpfulAlertText)}
        style={{ padding: '0 8px', height: '100%' }}
      >
        {text}
      </span>
    </div>
  );
}
