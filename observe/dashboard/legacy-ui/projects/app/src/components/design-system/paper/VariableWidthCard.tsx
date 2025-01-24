import { createStyles, Paper } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles((theme, { fixedHeight }: { fixedHeight: number }) => ({
  firstCard: {
    marginLeft: '16px',
  },
  cardCommon: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginLeft: '8px',
    marginRight: '8px',
    minWidth: '640px',
    border: `2px solid ${Colors.brandSecondary200}`,
    minHeight: '180px',
    height: 'fit-content',
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing.md,
    paddingBottom: '8px',
  },
  fixedHeight: {
    height: fixedHeight,
  },
  alertBorder: {
    border: `2px solid ${Colors.red}`,
  },
  spacerOnly: {
    backgroundColor: 'transparent',
    border: `2px solid transparent`,
    flexBasis: '34%',
  },
}));

interface VariableWidthCardProps {
  children: React.ReactNode;
  first?: boolean;
  alert?: boolean;
  spacerOnly?: boolean;
  height?: number;
}

export function VariableWidthCard({ children, first, alert, spacerOnly, height }: VariableWidthCardProps): JSX.Element {
  const { classes, cx } = useStyles({ fixedHeight: height ?? 640 });
  return (
    <Paper
      className={cx(
        classes.cardCommon,
        first ? classes.firstCard : '',
        alert ? classes.alertBorder : '',
        height ? classes.fixedHeight : '',
        spacerOnly ? classes.spacerOnly : '',
      )}
      radius="sm"
    >
      {children}
    </Paper>
  );
}
