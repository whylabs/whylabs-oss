import { FormControlLabel, Switch } from '@material-ui/core';
import useTypographyStyles from 'styles/Typography';
import { createStyles } from '@mantine/core';
import useCommonCellStyles from './CommonStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
});

interface MonitorManagetStatusCellProps {
  enabled: boolean;
  onChange: () => void;
  userCanEdit: boolean;
}

export default function MonitorManagerStatusCell({
  enabled,
  onChange,
  userCanEdit,
}: MonitorManagetStatusCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: cellStyles } = useCommonCellStyles();
  const { classes: typography } = useTypographyStyles();

  return (
    <div className={cx(styles.root, cellStyles.cellIndention)}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={onChange} color="primary" />}
        classes={{
          label: typography.monitorManagerStrongTableText,
        }}
        label={enabled ? 'On' : 'Off'}
        disabled={!userCanEdit}
      />
    </div>
  );
}
