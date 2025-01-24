import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    display: 'flex',
    backgroundColor: Colors.warningColor,
    justifyContent: 'space-between',
    height: 'inherit',
  },
  left: {
    marginLeft: '30px',
  },
  right: {
    marginRight: '30px',
  },
});

const warningGenerator: Generator<string> = (function* () {
  const warnings = ['WARNING', 'ACHTUNG', 'ОСТОРОЖНО', 'PERIGO'];

  let idx = -1;
  while (true) {
    idx = (idx + 1) % warnings.length;
    yield `${warnings[idx]}!`;
  }
})();

const getNextWarning = (): string => warningGenerator.next().value;

export const WhyLabsInternalWarningBar: React.FC = () => {
  const { classes: styles } = useStyles();

  return (
    <div className={styles.root}>
      <h2 className={styles.left}>{getNextWarning()}</h2>
      <h2>This page is for internal use only.</h2>
      <h2 className={styles.right}>{getNextWarning()}</h2>
    </div>
  );
};
