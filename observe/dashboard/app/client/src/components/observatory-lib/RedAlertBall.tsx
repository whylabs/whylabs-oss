import { Badge, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { JSX } from 'react';

const useStyles = createStyles((_, clickable: boolean) => ({
  standard: {
    backgroundColor: Colors.red,
    color: Colors.white,
    border: `1px solid ${Colors.white}`,
    fontWeight: 'bold',
    lineHeight: 1,
  },
  inverted: {
    backgroundColor: Colors.white,
    color: Colors.red,
    border: `1px solid ${Colors.red}`,
    fontWeight: 'bold',
    lineHeight: 1,
  },
  adHoc: {
    backgroundColor: Colors.white,
    color: Colors.chartOrange,
    border: `1px solid ${Colors.chartOrange}`,
    fontWeight: 'bold',
    lineHeight: 1,
  },
  root: {
    cursor: clickable ? 'pointer' : 'default',
    minHeight: 24,
    minWidth: 24,
    padding: '0 4px',
  },
}));

type RedAlertBallProps = {
  'aria-label'?: string;
  alerts: number;
  adHocRunId?: string;
  inverted?: boolean;
  onClick?: () => void;
};

export const RedAlertBall = ({ alerts, inverted, adHocRunId, ...rest }: RedAlertBallProps): JSX.Element => {
  const { classes, cx } = useStyles(!!rest.onClick);
  let className = classes.standard;

  if (adHocRunId) {
    className = classes.adHoc;
  } else if (inverted) {
    className = classes.inverted;
  }

  return (
    <Badge
      variant={inverted ? 'outline' : 'filled'}
      classNames={{
        root: cx(className, classes.root),
      }}
      {...rest}
    >
      {alerts.toFixed(0)}
    </Badge>
  );
};
