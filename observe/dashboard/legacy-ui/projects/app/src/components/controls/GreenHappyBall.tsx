import { Colors } from '@whylabs/observatory-lib';
import { IconCheck } from '@tabler/icons';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  happyBall: {
    height: 24,
    width: 24,
    borderRadius: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standard: {
    backgroundColor: Colors.green,
    color: Colors.white,
    border: `1px solid ${Colors.white}`,
  },
  inverted: {
    backgroundColor: Colors.white,
    color: Colors.green,
    border: `1px solid ${Colors.green}`,
  },
});

export interface GreenHappyBallProps {
  inverted?: boolean;
}

const GreenHappyBall: React.FC<GreenHappyBallProps> = ({ inverted }) => {
  const { classes: styles, cx } = useStyles();
  return (
    <div className={cx(styles.happyBall, inverted ? styles.inverted : styles.standard)}>
      <IconCheck style={{ color: inverted ? Colors.green : Colors.white, padding: 5 }} />
    </div>
  );
};

export default GreenHappyBall;
