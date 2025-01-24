import { createStyles } from '@mantine/core';
import { ReactElement, ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

import { WhyLabsContextMenu, WhyLabsText } from '../design-system';
import { WhyLabsContextMenuItem } from '../design-system/context-menu/WhyLabsContextMenu';

const useStyles = createStyles({
  root: {
    background: 'white',
    border: `2px solid ${Colors.secondaryLight200}`,
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 360,
    padding: 15,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: Colors.brandSecondary900,
    fontSize: 16,
    fontWeight: 400,
  },
});

type ChartCardProps = {
  children: ReactNode;
  classNames?: {
    root?: string;
    titleContainer?: string;
  };
  displayMenuContext?: {
    items: WhyLabsContextMenuItem[];
    onClose: () => void;
    x: number;
    y: number;
    width: number;
  };
  title?: ReactElement | string;
  titleRightChildren?: ReactNode;
};

export const ChartCard = ({ children, classNames, displayMenuContext, title, titleRightChildren }: ChartCardProps) => {
  const { classes, cx } = useStyles();

  const shouldDisplayTitleContainer = title || titleRightChildren;

  return (
    <div className={cx(classes.root, classNames?.root)} data-testid="ChartCard">
      {shouldDisplayTitleContainer && (
        <div className={cx(classes.titleContainer, classNames?.titleContainer)}>
          <WhyLabsText className={classes.title}>{title}</WhyLabsText>
          {titleRightChildren}
        </div>
      )}
      {children}
      {!!displayMenuContext && (
        <WhyLabsContextMenu
          items={displayMenuContext.items}
          opened={!!displayMenuContext}
          onClose={displayMenuContext.onClose}
          styles={{
            dropdown: {
              position: 'absolute',
              top: `${displayMenuContext.y}px !important`,
              left: `${displayMenuContext.x}px !important`,
            },
          }}
          width={displayMenuContext.width}
        />
      )}
    </div>
  );
};
