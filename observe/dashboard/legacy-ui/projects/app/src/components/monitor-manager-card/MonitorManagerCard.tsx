import { useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { Skeleton } from '@material-ui/lab';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import WhyLabsLinkButton from 'components/design-system/button/WhyLabsLinkButton';
import { createStyles } from '@mantine/core';
import { tooltips } from 'strings/tooltips';
import { WhyLabsButton, WhyLabsTooltip } from '../design-system';

const useStyles = createStyles({
  root: {
    width: '256px',
    minHeight: '185px',
    padding: '15px',
    background: Colors.white,
    border: `2px solid ${Colors.brandSecondary200}`,
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    display: 'flex',
    marginBottom: '25px',
  },
  icon: {
    minWidth: '60px',
    height: '60px',
    marginRight: '10px',
  },
  text: {
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: '20px',
  },
  categoryTitle: {
    margin: 0,
    marginBottom: '13px',
    fontFamily: `"Baloo 2"`,
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '20px',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  enableButton: {
    width: '100%',
  },
  buttonText: {
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: '14px',
  },
  contentTitle: {
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: '20px',
    margin: 0,
    fontStyle: 'italic',
  },
  titleContainer: {
    display: 'inline-flex',
    position: 'relative',
    marginBottom: '5px',
    padding: '0 5px',
  },
  titleBackground: {
    position: 'absolute',
    borderRadius: '4px',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.1,
  },
});

interface MonitorManagerCardProps {
  color: string;
  id: string;
  categoryTitle: string;
  title: string;
  text: JSX.Element;
  className?: string;
  onConfigureClick?: (setLoading: React.Dispatch<React.SetStateAction<boolean>>) => void;
  onEnableClick?: (setLoading: React.Dispatch<React.SetStateAction<boolean>>) => void;
  icon: string;
  disableControls?: boolean;
  disableConfigure?: boolean;
  classes?: {
    icon?: string;
    rightPanel?: string;
  };
  noPerformance?: boolean;
  customJsonCard?: boolean;
  redirectLink?: string;
  userCanManageMonitors: boolean;
}

type ButtonContent = {
  tooltip: string;
  text: string;
};

export default function MonitorManagerCard({
  color,
  categoryTitle,
  title,
  text,
  className,
  onConfigureClick,
  onEnableClick,
  icon,
  classes,
  disableControls = false,
  disableConfigure = false,
  customJsonCard = false,
  redirectLink,
  noPerformance = false,
  id,
  userCanManageMonitors,
}: MonitorManagerCardProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const { handleNavigation } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();

  const enableButtonContent = (): ButtonContent => {
    if (customJsonCard) {
      return {
        text: 'Set up JSON configuration',
        tooltip: 'Configure this preset via the JSON editor. Can be edited later via the JSON editor',
      };
    }
    return {
      text: 'Enable with one click',
      tooltip: 'Enable this preset without any configuration. Can be edited later via the UI builder or JSON editor',
    };
  };

  function renderControls() {
    if (isLoading) return <Skeleton width="100%" height={32} />;
    const mainButtonContent = enableButtonContent();
    return !noPerformance ? (
      <>
        <div className={styles.enableButton}>
          <WhyLabsTooltip
            label={!userCanManageMonitors ? tooltips.hasNoPermissionToCreateMonitor : mainButtonContent.tooltip}
          >
            {customJsonCard ? (
              <WhyLabsLinkButton size="xs" width="full" href={redirectLink ?? '#'} variant="outline" color="gray">
                {mainButtonContent.text}
              </WhyLabsLinkButton>
            ) : (
              <WhyLabsButton
                id={`${id}--enable-button`}
                variant="outline"
                color="gray"
                size="xs"
                disabled={disableControls || !userCanManageMonitors}
                onClick={() => onEnableClick?.(setIsLoading)}
              >
                {mainButtonContent.text}
              </WhyLabsButton>
            )}
          </WhyLabsTooltip>
        </div>
        {!customJsonCard && (
          <WhyLabsTooltip
            label={
              !userCanManageMonitors
                ? tooltips.hasNoPermissionToCreateMonitor
                : 'Configure this preset via the UI builder. Can be edited later via the UI builder or JSON editor'
            }
          >
            <WhyLabsButton
              id={`${id}--configure-button`}
              variant="outline"
              color="gray"
              size="xs"
              disabled={disableControls || disableConfigure || !userCanManageMonitors}
              onClick={() => onConfigureClick?.(setIsLoading)}
            >
              Configure
            </WhyLabsButton>
          </WhyLabsTooltip>
        )}
      </>
    ) : (
      <WhyLabsButton
        variant="outline"
        color="gray"
        size="xs"
        width="full"
        onClick={() => handleNavigation({ page: 'performance', modelId })}
        id={`${id}--setup-performance-button`}
      >
        Setup performance metrics
      </WhyLabsButton>
    );
  }

  return (
    <div className={cx(styles.root, className)} id={id}>
      <p className={cx(styles.categoryTitle)} style={{ color }}>
        {title}
      </p>
      <div className={styles.content}>
        <img src={icon} className={cx(styles.icon, classes?.icon)} alt="monitor visual" />
        <div className={classes?.rightPanel}>
          <div className={styles.titleContainer}>
            <div className={styles.titleBackground} style={{ background: color }} />
            <p
              className={styles.contentTitle}
              style={{ position: 'relative', letterSpacing: categoryTitle.length >= 20 ? '-0.6px' : 'unset' }}
            >
              {categoryTitle}
            </p>
          </div>
          <p className={styles.text} style={{ margin: 0 }}>
            {text}
          </p>
        </div>
      </div>

      <div className={styles.controls}>{renderControls()}</div>
    </div>
  );
}
