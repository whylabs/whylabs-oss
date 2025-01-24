import { IconButton } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import CloseIcon from '@material-ui/icons/Close';
import useTypographyStyles from 'styles/Typography';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    display: 'flex',
    paddingLeft: '15px',
    paddingRight: '15px',
    borderRadius: '4px',
    border: `2px solid ${Colors.brandSecondary200}`,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginLeft: 'auto',
  },
  text: {
    color: Colors.brandPrimary900,
  },
});

interface MonitorManagerBannerProps {
  content: JSX.Element;
  className?: string;
  iconClassName?: string;
  onCloseClick?: () => void;
  classes?: {
    text?: string;
  };
}

export default function MonitorManagerBanner({
  content,
  className,
  iconClassName,
  onCloseClick,
  classes,
}: MonitorManagerBannerProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();

  return (
    <div className={cx(styles.root, className)}>
      <div className={cx(styles.text, typography.monitorManagerBannerTitle, classes?.text)}>{content}</div>
      <IconButton
        onClick={() => {
          if (onCloseClick) onCloseClick();
        }}
      >
        <CloseIcon className={cx(styles.icon, iconClassName)} style={{ color: Colors.brandSecondary700 }} />
      </IconButton>
    </div>
  );
}
