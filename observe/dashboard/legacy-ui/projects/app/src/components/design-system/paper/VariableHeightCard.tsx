import { createStyles, Paper } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles((theme, { fixedWidth }: { fixedWidth: number }) => ({
  cardTop: {
    marginTop: theme.spacing.sm,
  },
  firstCardTop: {
    marginTop: theme.spacing.md,
  },
  cardCommon: {
    marginBottom: theme.spacing.sm,
    marginLeft: '16px',
    marginRight: '16px',
    minWidth: '640px',
    border: `2px solid ${Colors.brandSecondary200}`,
    minHeight: '180px',
    height: 'fit-content',
    overflowY: 'auto',
    padding: theme.spacing.md,
    paddingBottom: '8px',
  },
  fixedWidth: {
    width: fixedWidth,
  },
  alertBorder: {
    border: `2px solid ${Colors.red}`,
  },
}));

interface VariableHeightCardProps {
  children: React.ReactNode;
  first?: boolean;
  alert?: boolean;
  width?: number;
}

export function VariableHeightCard({ children, first, alert, width }: VariableHeightCardProps): JSX.Element {
  const { classes, cx } = useStyles({ fixedWidth: width ?? 640 });
  return (
    <Paper
      className={cx(
        classes.cardCommon,
        first ? classes.firstCardTop : classes.cardTop,
        alert ? classes.alertBorder : '',
        width ? classes.fixedWidth : '',
      )}
      radius="sm"
    >
      {children}
    </Paper>
  );
}
