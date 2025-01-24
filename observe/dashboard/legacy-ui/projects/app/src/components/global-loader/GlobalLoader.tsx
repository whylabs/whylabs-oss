import { CircularProgress } from '@material-ui/core';
import { useState, useEffect } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  wholeScreen: {
    position: 'absolute',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  shadow: {
    position: 'absolute',
    background: Colors.black,
    opacity: 0.2,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  circle: {
    position: 'relative',
    zIndex: 101,
  },
  loader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  },
});

interface GlobalLoaderProps {
  interval?: number;
  wholeScreen?: boolean;
  shadow?: boolean;
}

export default function GlobalLoader({
  interval = 0,
  wholeScreen = false,
  shadow = false,
}: GlobalLoaderProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (interval > 0) setIsShown(true);
    }, interval);

    return () => {
      clearTimeout(timeout);
    };
  }, [interval]);

  const returnLoader = () => {
    if (wholeScreen)
      return (
        <>
          {shadow && <div className={styles.shadow} />}
          <div className={styles.wholeScreen} data-testid="GlobalLoaderWholeScreen">
            <CircularProgress className={styles.circle} />
          </div>
        </>
      );

    return (
      <div className={cx(styles.loader)} data-testid="GlobalLoader">
        <CircularProgress />
      </div>
    );
  };

  return <>{(isShown || !interval) && returnLoader()} </>;
}
