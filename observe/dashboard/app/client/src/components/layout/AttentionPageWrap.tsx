import { createStyles } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Colors } from '~/assets/Colors';
import noDataBackground from '~/assets/noDataBackground.svg';
import noDataCubesLeft from '~/assets/noDataCubesLeft.svg';
import noDataCubesRight from '~/assets/noDataCubesRight.svg';
import { ReactNode } from 'react';

import { WhyLabsTypography } from '../design-system';
import { WhyLabsLogo } from '../WhyLabsLogo/WhyLabsLogo';

const mobileScreenMediaBreak = '(max-width:700px)';
const mobileScreenMediaBreakCss = `@media ${mobileScreenMediaBreak}`;

const useStyles = createStyles(() => ({
  root: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',

    backgroundImage: `url(${noDataCubesLeft}), url(${noDataCubesRight}), url(${noDataBackground})`,
    backgroundPosition: 'left top, right top, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    backgroundSize: '465px 419px, 261px 367px, cover',
  },
  centeredWrap: {
    zIndex: 1,
    width: 680,
    display: 'block',
    minHeight: '100%',
    position: 'relative',
    [mobileScreenMediaBreakCss]: {
      width: 'calc(100% - 2 * 15px)',
    },
  },
  contentWrap: {
    padding: '70px 0 120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '100%',
    zIndex: 1,
    position: 'relative',
  },
  contentWrapWidth: {
    maxWidth: 450,
    [mobileScreenMediaBreakCss]: {
      maxWidth: '100%',
    },
  },
  title: {
    fontFamily: '"Baloo 2"',
    fontSize: 36,
    fontWeight: 600,
    lineHeight: '44px',
    background: `linear-gradient(to right, ${Colors.orange}, ${Colors.yellow})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 24,
    lineHeight: '30px',
    color: Colors.secondaryLight1000,
    margin: '10px 0 30px',

    '& a': {
      color: Colors.linkColor,
      fontWeight: 'bold',
    },
  },
  logo: {
    position: 'absolute',
    bottom: 70,
    left: 0,
  },
  dogWrap: {
    [mobileScreenMediaBreakCss]: {
      display: 'none',
    },
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: '50%',
    '& > div': {
      transform: 'translateY(50%)',
    },
  },
  dogWrapMobile: {
    display: 'none',
    [mobileScreenMediaBreakCss]: {
      display: 'block',
      '& > div': {
        position: 'relative',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        display: 'flex',
        justifyContent: 'center',
      },
    },
  },
  childrenStyle: {
    textAlign: 'left',
    fontSize: '18px',
    lineHeight: '30px',
    fontFamily: 'Asap',
    color: Colors.brandSecondary700,
  },
}));

interface AttentionPageWrapProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  children?: ReactNode;
  dog?: ReactNode;
}
export const AttentionPageWrap = ({ children, title, subtitle, dog }: AttentionPageWrapProps) => {
  const { classes, cx } = useStyles();
  const isSmallerScreen = useMediaQuery(mobileScreenMediaBreak);

  return (
    <div className={classes.root}>
      <div className={classes.centeredWrap}>
        <div className={cx(classes.contentWrap, dog && classes.contentWrapWidth)}>
          {typeof title === 'string' ? <WhyLabsTypography className={classes.title}>{title}</WhyLabsTypography> : title}
          {subtitle && (
            <WhyLabsTypography className={classes.subtitle} element="h2">
              {subtitle}
            </WhyLabsTypography>
          )}
          <div className={classes.childrenStyle}>{children}</div>
          {isSmallerScreen && dog && <div className={classes.dogWrapMobile}>{dog}</div>}
          <WhyLabsLogo className={classes.logo} isDark />
        </div>
        {!isSmallerScreen && dog && <div className={classes.dogWrap}>{dog}</div>}
      </div>
    </div>
  );
};
