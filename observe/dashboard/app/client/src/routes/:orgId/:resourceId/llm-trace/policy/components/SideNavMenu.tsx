import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { SkeletonGroup, WhyLabsText, WhyLabsTooltip } from '~/components/design-system';
import { generateIcon } from '~/components/factories/IconFactory';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { Fragment, ReactElement } from 'react';

const useStyles = createStyles({
  sideNav: {
    display: 'flex',
    minWidth: '290px',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
    padding: '15px 0',
    overflow: 'auto',
    maxHeight: 'calc(100vh - 44px - 54px - 67px)', // dark-header / tabs / footer
  },
  sideNavTitle: {
    color: Colors.brandPrimary900,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1,
  },
  navGroupTitleWrapper: {
    padding: '13px 12px',
    width: '100%',
    height: 40,
  },
  invisibleButton: {
    width: '100%',
  },
  navItem: {
    width: '100%',
    height: 40,
    display: 'flex',
    padding: '4px 15px 4px 4px',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'stretch',
    borderRadius: 4,
    background: 'white',
    transition: 'background 150ms ease',
    '&:hover': {
      background: Colors.secondaryLight100,
    },
  },
  disabledNavItem: {
    '&:hover': {
      background: 'unset',
    },
  },
  activeNavItem: {
    background: Colors.secondaryLight100,
  },
  activeIndicator: {
    width: 3,
    height: '100%',
    background: Colors.brandPrimary900,
    borderRadius: 2,
  },
  itemTitleWrapper: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1,
  },
  disabledItemTitleWrapper: {
    color: Colors.mantineLightGray,
  },
  hidden: {
    visibility: 'hidden',
  },
});

export type SideNavMenuProps = {
  activeItem?: string | null;
  isLoading?: boolean;
  sections: Array<{
    title: string;
    items: Array<{
      id: string;
      icon: string;
      label: string;
      clickHandler?: () => void;
      disabled?: boolean;
      disabledTooltip?: string;
    }>;
  }>;
};
export const SideNavMenu = ({ sections, activeItem, isLoading }: SideNavMenuProps): ReactElement => {
  const { classes, cx } = useStyles();
  if (isLoading)
    return (
      <aside className={classes.sideNav}>
        <SkeletonGroup count={10} height={40} mt={5} width="100%" />
      </aside>
    );
  return (
    <aside className={classes.sideNav}>
      {sections.map(({ title, items }) => (
        <Fragment key={`nav-group--${title}`}>
          <div className={classes.navGroupTitleWrapper}>
            <WhyLabsText className={classes.sideNavTitle}>{title}</WhyLabsText>
          </div>
          {items.map(({ icon, label, id, clickHandler, disabledTooltip, disabled }) => {
            return (
              <InvisibleButton id={id} key={id} aria-label={label} onClick={disabled ? undefined : clickHandler}>
                <WhyLabsTooltip label={disabled && disabledTooltip ? disabledTooltip : ''}>
                  <div
                    className={cx(classes.navItem, {
                      [classes.activeNavItem]: id === activeItem && !disabled,
                      [classes.disabledNavItem]: disabled,
                    })}
                  >
                    <div className={cx(classes.activeIndicator, { [classes.hidden]: id !== activeItem })} />
                    <div className={cx(classes.itemTitleWrapper, { [classes.disabledItemTitleWrapper]: disabled })}>
                      {generateIcon({
                        name: icon,
                        size: 18,
                        color: disabled ? Colors.mantineLightGray : Colors.secondaryLight1000,
                      })}
                      {label}
                    </div>
                  </div>
                </WhyLabsTooltip>
              </InvisibleButton>
            );
          })}
        </Fragment>
      ))}
    </aside>
  );
};
