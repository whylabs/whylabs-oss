import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  spacer: {
    flexGrow: 1,
    flexBasis: '0px',
    maxWidth: 'none',
    minWidth: '0',
    borderLeft: '2px solid white',
    margin: 0,
    padding: 0,
  },
});

export function HeaderEmptyFillWidget(): JSX.Element {
  const { classes, cx } = useStyles();
  const { classes: modelWidgetStyle } = useModelWidgetStyles();

  return <div className={cx(modelWidgetStyle.root, classes.spacer)} style={{ paddingLeft: 0, paddingRight: 0 }} />;
}
