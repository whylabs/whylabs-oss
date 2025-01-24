import { Colors } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { createStyles } from '@mantine/core';
import useCommonCellStyles from './CommonStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  cellText: {
    margin: 'auto 0',
    width: '100%',
  },
  grayoutCellText: {
    color: Colors.brandSecondary600,
  },
});

interface MonitorManagerTextCellProps {
  content: JSX.Element;
  onClick?: () => void;
  enabled?: boolean;
}

export default function MonitorManagerTextCell({
  content,
  onClick,
  enabled = true,
}: MonitorManagerTextCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: cellStyles } = useCommonCellStyles();
  const { classes: typography } = useTypographyStyles();

  const child = (
    <span className={cx(styles.cellText, typography.monitorManagerTableText, !enabled && styles.grayoutCellText)}>
      {content}
    </span>
  );
  if (onClick) {
    return (
      <InvisibleButton className={cx(styles.root, cellStyles.cellIndention)} onClick={onClick}>
        {child}
      </InvisibleButton>
    );
  }
  return <div className={cx(styles.root, cellStyles.cellIndention)}>{child}</div>;
}
