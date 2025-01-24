import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';

/*
 * Component to wrap pages and apply common styles
 * */
type StyleProps = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  backgroundColor?: string;
  height?: number | string;
  width?: number | string;
};

type PagePaddingWrapperProps = StyleProps & {
  children: ReactNode;
};

const DEFAULT_PADDING = 16;
export const PageContentWrapper = ({
  children,
  top = DEFAULT_PADDING,
  left = DEFAULT_PADDING,
  right = DEFAULT_PADDING,
  bottom = DEFAULT_PADDING,
  width,
  height,
  backgroundColor,
  ...rest
}: PagePaddingWrapperProps) => {
  const { classes } = useCommonStyles({ top, left, right, bottom, height, ...rest });
  return (
    <div style={{ width, height, backgroundColor }}>
      <div className={classes.root}>{children}</div>
    </div>
  );
};

const useCommonStyles = createStyles((_, { top, left, right, height, bottom, ...rest }: StyleProps) => ({
  root: {
    paddingTop: top,
    paddingBottom: bottom,
    paddingRight: right,
    paddingLeft: left,
    height: height ? `calc(${height} - ${top ?? 0}px - ${bottom ?? 0}px)` : 'auto',
    ...rest,
  },
}));
