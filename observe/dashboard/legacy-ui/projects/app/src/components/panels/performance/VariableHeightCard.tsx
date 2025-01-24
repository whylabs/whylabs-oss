import { createStyles, Paper } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles((theme) => ({
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
  alertBorder: {
    border: `2px solid ${Colors.red}`,
  },
}));

interface VariableHeightCardProps {
  children: React.ReactNode;
  first?: boolean;
  alert?: boolean;
}

export function VariableHeightCard({ children, first, alert }: VariableHeightCardProps): JSX.Element {
  const { classes, cx } = useStyles();
  return (
    <Paper
      className={cx(
        classes.cardCommon,
        first ? classes.firstCardTop : classes.cardTop,
        alert ? classes.alertBorder : '',
      )}
      radius="sm"
    >
      {children}
    </Paper>
  );
}
