import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import WhyLabsText from 'components/design-system/text/WhyLabsText';
import { SquareProfileToggle } from './SquareProfileToggle';

const useStyles = createStyles({
  titleBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: '8px',
    fontFamily: 'Asap',
  },
  endGroup: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '8px',
    alignItems: 'baseline',
  },
  titleText: {
    fontSize: 16,
    lineHeight: 1.2,
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 1.43,
    color: Colors.brandSecondary900,
    fontWeight: 400,
  },
});

interface SquareGraphTitleBarProps {
  title: string;
  info: string;
  bumpProfile: (increase: boolean) => void;
  hasNextProfile: () => boolean;
  hasPreviousProfile: () => boolean;
}

export function SquareGraphTitleBar({
  title,
  info,
  bumpProfile,
  hasNextProfile,
  hasPreviousProfile,
}: SquareGraphTitleBarProps): JSX.Element {
  const { classes } = useStyles();

  return (
    <div className={classes.titleBar}>
      <WhyLabsText inherit className={classes.titleText}>
        {title}
      </WhyLabsText>
      <div className={classes.endGroup}>
        <SquareProfileToggle
          bumpProfile={bumpProfile}
          hasNextProfile={hasNextProfile}
          hasPreviousProfile={hasPreviousProfile}
        />
        <WhyLabsText inherit className={classes.infoText}>
          {info}
        </WhyLabsText>
      </div>
    </div>
  );
}
