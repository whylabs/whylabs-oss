import { Chip } from '@material-ui/core';
import React from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '../constants/colors';

const useStyles = createStyles((_, clickable: boolean) => ({
  alertball: {
    height: 24,
    width: 24,
    borderRadius: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standard: {
    backgroundColor: Colors.red,
    color: Colors.white,
    border: `1px solid ${Colors.white}`,
    fontWeight: 600,
    lineHeight: 1,
  },
  inverted: {
    backgroundColor: Colors.white,
    color: Colors.red,
    border: `1px solid ${Colors.red}`,
    fontWeight: 600,
    lineHeight: 1,
  },
  adHoc: {
    backgroundColor: Colors.white,
    color: Colors.chartOrange,
    border: `1px solid ${Colors.chartOrange}`,
    fontWeight: 600,
    lineHeight: 1,
  },
  cursor: {
    cursor: clickable ? 'pointer' : 'initial',
  },
}));

export interface RedAlertBallProps {
  alerts: number;
  adHocRunId?: string;
  inverted?: boolean;
  onClick?: () => void;
}

export const RedAlertBall: React.FC<RedAlertBallProps> = ({ alerts, inverted, adHocRunId, onClick }) => {
  const { classes, cx } = useStyles(!!onClick);
  let className = classes.standard;

  if (adHocRunId) {
    className = classes.adHoc;
  } else if (inverted) {
    className = classes.inverted;
  }

  return (
    <Chip
      variant={inverted ? 'outlined' : 'default'}
      className={cx(className, classes.cursor)}
      label={alerts.toFixed(0)}
      onClick={onClick}
      size="small"
    />
  );
};
