import { Drawer, DrawerProps, MantineNumberSize, Portal, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { useMount } from '~/hooks/useMount';
import { isNumber } from '~/utils/typeGuards';
import { atom, useAtom } from 'jotai';
import { MouseEvent, ReactNode, useRef } from 'react';

import { CLOSE_BUTTON_DEFAULT_PROPS } from '../button/WhyLabsCloseButton';

export const DRAWER_HEADER_HEIGHT = 44;
const MIN_DRAWER_WIDTH = 350;
type StyleProps = Pick<WhyLabsDrawerProps, 'withOverlay' | 'isOpen' | 'position' | 'size'> & {
  disablePointerEvents: boolean;
  scrollWidth: number;
  isDragging?: boolean;
};
const RESIZE_LINE_WIDTH = 4;
const useStyles = createStyles(
  (
    _,
    { withOverlay, isOpen, position = 'right', size, disablePointerEvents, scrollWidth, isDragging }: StyleProps,
  ) => ({
    root: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: isOpen ? 'block' : 'none',
      pointerEvents: disablePointerEvents ? 'none' : 'unset',
      cursor: isDragging ? 'col-resize' : 'unset',
      zIndex: 995,
    },
    wrapper: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    resizerLine: {
      width: RESIZE_LINE_WIDTH,
      minWidth: RESIZE_LINE_WIDTH,
      height: '100%',
      cursor: 'col-resize',
      transition: 'all 100ms ease-out 50ms',
      outline: 'none',
      '&:hover': {
        transition: 'all 100ms ease-in 300ms',
        backgroundColor: `${Colors.blue} !important`,
      },
      position: 'absolute',
      [position]: `calc(${isNumber(size) ? `${size}px` : size} - ${RESIZE_LINE_WIDTH}px + ${scrollWidth}px)`,
      zIndex: 998,
      pointerEvents: 'all',
    },
    activeResize: {
      borderLeft: `1px solid ${Colors.transparent}`,
      transition: 'unset',
      backgroundColor: `${Colors.blue} !important`,
    },
    content: {
      boxShadow: withOverlay ? 'inherit' : '-10px 4px 20px 0px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      flexShrink: 0,
    },
    darkHeader: {
      backgroundColor: Colors.darkHeader,
      borderLeft: `.5px solid ${Colors.drawerBorder}`,
      color: Colors.white,
      height: DRAWER_HEADER_HEIGHT,
    },
    handlePointerEvents: {
      pointerEvents: isDragging ? 'none' : undefined,
    },
    body: {
      flex: 1,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    closeButton: {
      borderColor: Colors.brandSecondary400,
      color: Colors.brandSecondary900,
    },
  }),
);

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
  position?: 'right' | 'left';
  resizable?: boolean;
  // minWidth when the drawer is resizable
  minWidth?: number;
  // maxWidth when the drawer is resizable
  maxWidth?: number;
  uniqueId: string;
};

interface ResizerState {
  isDragging: boolean;
  width?: MantineNumberSize;
  lastClientX?: number;
}

const drawerWidthCache = atom<Map<string, ResizerState>>(new Map());

export const WhyLabsDrawer = ({
  classNames,
  children,
  closeButtonLabel = 'Close Drawer',
  darkHeader,
  isOpen,
  position = 'right',
  onClose,
  resizable = true,
  minWidth = MIN_DRAWER_WIDTH,
  maxWidth,
  withOverlay = true,
  uniqueId,
  ...rest
}: WhyLabsDrawerProps): JSX.Element => {
  const [widthCache, setWidthCache] = useAtom(drawerWidthCache);
  const drawerResizer = widthCache.get(uniqueId) ?? {
    isDragging: false,
    width: rest.size,
  };
  useMount(() => {
    if (!widthCache.get(uniqueId)) {
      setWidthCache((cache) => {
        const newState = new Map(cache);
        const prev = cache.get(uniqueId);
        newState.set(uniqueId, prev ?? drawerResizer);
        return newState;
      });
    }
    return () => {
      setDraggingFalse();
    };
  });

  const disablePointerEvents = !withOverlay && !drawerResizer?.isDragging;
  const scrollWidth = window.innerWidth - document.body.clientWidth;
  const { classes, cx } = useStyles({
    isOpen,
    position,
    ...rest,
    size: drawerResizer?.width,
    disablePointerEvents,
    scrollWidth: drawerResizer?.lastClientX === undefined ? 0 : scrollWidth,
    isDragging: drawerResizer?.isDragging,
  });
  const container = useRef<HTMLDivElement | null>(null);
  const usedMaxWidth = maxWidth ?? window.innerWidth - 100;

  const handleResizeMouseDown = (ev?: MouseEvent<HTMLButtonElement>) => {
    if (!ev || !container.current) return;
    ev.stopPropagation();
    setWidthCache((cache) => {
      const newState = new Map(cache);
      const prev = cache.get(uniqueId) ?? drawerResizer;
      newState.set(uniqueId, { ...prev, isDragging: true, lastClientX: ev?.clientX });
      return newState;
    });
  };

  const handleResizeMouseUp = (ev?: MouseEvent<HTMLDivElement>) => {
    setWidthCache((cache) => {
      const newState = new Map(cache);
      const prev = cache.get(uniqueId);
      if (prev?.isDragging) {
        newState.set(uniqueId, { ...prev, isDragging: false, lastClientX: ev?.clientX });
      }
      return newState;
    });
  };

  const handleResizing = (ev?: MouseEvent<HTMLDivElement>) => {
    if (!drawerResizer?.isDragging) return;
    setWidthCache((cache) => {
      const newState = new Map(cache);
      const prev = cache.get(uniqueId) ?? drawerResizer;
      if (!container.current || !ev?.clientX) return cache;
      const clientX = ev.clientX + 4;
      const newWidth = position === 'left' ? clientX : document.body.clientWidth - clientX;
      if (newWidth < minWidth) {
        newState.set(uniqueId, { ...prev, width: minWidth });
        return newState;
      }
      if (newWidth >= usedMaxWidth) {
        newState.set(uniqueId, { ...prev, width: usedMaxWidth });
      } else {
        newState.set(uniqueId, { ...prev, lastClientX: ev?.clientX, width: newWidth });
      }
      return newState;
    });
  };

  const setDraggingFalse = () => {
    setWidthCache((cache) => {
      const newState = new Map(cache);
      const prev = cache.get(uniqueId) ?? drawerResizer;
      newState.set(uniqueId, { ...prev, isDragging: false });
      return newState;
    });
  };

  const handleOnClose = () => {
    setDraggingFalse();
    onClose();
  };

  return (
    <Portal className={classes.root}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={classes.wrapper}
        ref={container}
        onMouseMove={handleResizing}
        onMouseUp={handleResizeMouseUp}
        onMouseLeave={handleResizeMouseUp}
      >
        {resizable && (
          <InvisibleButton
            className={cx(classes.resizerLine, { [classes.activeResize]: drawerResizer?.isDragging })}
            onMouseDown={handleResizeMouseDown}
          />
        )}
        <Drawer
          classNames={{
            ...classNames,
            header: cx(
              classes.header,
              {
                [classes.darkHeader]: darkHeader,
              },
              classes.handlePointerEvents,
              classNames?.header,
            ),
            content: cx(classes.content, classNames?.content),
            body: cx(classes.body, classes.handlePointerEvents, classNames?.body),
          }}
          closeButtonProps={{
            'aria-label': closeButtonLabel,
            title: closeButtonLabel,
            ...CLOSE_BUTTON_DEFAULT_PROPS,
            color: 'dark',
            className: classes.closeButton,
          }}
          data-testid="WhyLabsDrawer"
          opened={isOpen}
          position={position}
          withinPortal={false}
          onClose={handleOnClose}
          {...rest}
          size={drawerResizer?.width}
          withOverlay={withOverlay}
        >
          {children}
        </Drawer>
      </div>
    </Portal>
  );
};
