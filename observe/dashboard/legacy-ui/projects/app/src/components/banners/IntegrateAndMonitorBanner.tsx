import { useState, useEffect } from 'react';
import { createStyles } from '@mantine/core';
import { Button, IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { Colors } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';

const btnHeight = 38;
const useStyles = createStyles({
  btnRoot: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 10px 10px 0',
    justifyContent: 'flex-end',
  },
  btnWrap: {
    borderRadius: '4px',
    backgroundColor: Colors.chartBlue,
    display: 'flex',
  },
  bannerBtn: {
    display: 'flex',
    alignContent: 'center',
    color: Colors.white,
    textDecoration: 'underline',
    fontWeight: 400,
    height: btnHeight,
    padding: '8px 15px',
    paddingRight: 0,
    whiteSpace: 'nowrap',
  },
  btnRemove: {
    height: btnHeight,
    width: btnHeight,
    margin: '0 6px',
    color: Colors.white,
  },
});

const localStorageIntegrateAndMonitorBannerProp = 'integrateAndMonitorBanner';

export default function IntegrateAndMonitorBanner(): JSX.Element | null {
  const { classes: styles } = useStyles();
  const { handleNavigation } = useNavLinkHandler();
  const [showBanner, setShowBanner] = useState(false);

  const setNewState = (currentShowBanner: boolean) => {
    setShowBanner(currentShowBanner);
    const currentShowBannerStringified = JSON.stringify(currentShowBanner);
    localStorage.setItem(localStorageIntegrateAndMonitorBannerProp, currentShowBannerStringified);
  };

  useEffect(() => {
    const currentShowBannerString = localStorage.getItem(localStorageIntegrateAndMonitorBannerProp);
    if (typeof currentShowBannerString === 'string') {
      try {
        const currentShowBanner = JSON.parse(currentShowBannerString);
        if (typeof currentShowBanner === 'boolean') {
          setNewState(currentShowBanner);
        } else {
          setNewState(true);
        }
      } catch (_) {
        setNewState(true);
      }
    } else {
      setNewState(true);
    }
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div className={styles.btnRoot}>
      <div className={styles.btnWrap}>
        <Button
          className={styles.bannerBtn}
          onClick={() => handleNavigation({ page: 'settings', settings: { path: 'integrations' } })}
        >
          I’m ready to integrate and monitor my own model data
        </Button>
        <IconButton className={styles.btnRemove} onClick={() => setNewState(false)}>
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  );
}
