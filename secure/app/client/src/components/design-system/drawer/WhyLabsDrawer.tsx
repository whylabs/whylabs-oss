import { Drawer, DrawerProps, createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { Colors } from '~/assets/Colors';

import { CLOSE_BUTTON_DEFAULT_PROPS } from '../button/WhyLabsCloseButton';

export const DRAWER_HEADER_HEIGHT = 44;

type StyleProps = Pick<DrawerProps, 'withOverlay'>;

const useStyles = createStyles((_, { withOverlay }: StyleProps) => ({
  content: {
    boxShadow: withOverlay ? 'inherit' : '-10px 4px 20px 0px rgba(0, 0, 0, 0.25)',
  },
  darkHeader: {
    backgroundColor: Colors.darkHeader,
    borderLeft: `.5px solid ${Colors.drawerBorder}`,
    color: Colors.white,
    height: DRAWER_HEADER_HEIGHT,
  },
}));

type WhyLabsDrawerProps = Pick<
  DrawerProps,
  'lockScroll' | 'onClose' | 'padding' | 'size' | 'title' | 'withCloseButton' | 'withOverlay'
> & {
  children: ReactNode;
  classNames?: {
    close?: string;
    body?: string;
    content?: string;
    header?: string;
  };
  closeButtonLabel?: string;
  darkHeader?: boolean;
  isOpen: boolean;
};

export const WhyLabsDrawer = ({
  classNames,
  children,
  closeButtonLabel = 'Close Drawer',
  darkHeader,
  isOpen,
  ...rest
}: WhyLabsDrawerProps): JSX.Element => {
  const { classes, cx } = useStyles({ withOverlay: rest.withOverlay });

  return (
    <Drawer
      classNames={{
        ...classNames,
        header: cx(
          {
            [classes.darkHeader]: darkHeader,
          },
          classNames?.header,
        ),
        content: cx(classes.content, classNames?.content),
      }}
      closeButtonProps={{
        'aria-label': closeButtonLabel,
        title: closeButtonLabel,
        ...CLOSE_BUTTON_DEFAULT_PROPS,
      }}
      data-testid="WhyLabsDrawer"
      opened={isOpen}
      position="right"
      withinPortal
      {...rest}
    >
      {children}
    </Drawer>
  );
};
