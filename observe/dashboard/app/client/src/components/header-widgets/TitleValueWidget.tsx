import { Skeleton, SkeletonProps, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ReactNode } from 'react';

import { WhyLabsText } from '../design-system';

export const useTitleValueWidgetStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.42,
    margin: 0,
  },
  valueContainer: {
    alignItems: 'center',
    display: 'flex',
    minHeight: 36,
    margin: 0,
  },
  value: {
    color: Colors.linkColor,
    fontSize: 16,
    lineHeight: 1.25,
    margin: 0,
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
}));

type TitleValueWidgetProps = {
  children: string | number | ReactNode;
  isLoading?: boolean;
  loadingSkeletonProps?: Pick<SkeletonProps, 'circle' | 'height' | 'radius' | 'width'>;
  title: ReactNode;
  filterId?: string;
};

export const TitleValueWidget = ({
  children,
  isLoading,
  loadingSkeletonProps,
  title,
  filterId,
}: TitleValueWidgetProps) => {
  const { classes } = useTitleValueWidgetStyles();

  const valueElement = (() => {
    if (isLoading) return <Skeleton data-testid="LoadingSkeleton" height={18} width="100%" {...loadingSkeletonProps} />;

    const isStringOrNumber = typeof children === 'string' || typeof children === 'number';
    if (isStringOrNumber) return <WhyLabsText className={classes.value}>{children}</WhyLabsText>;

    return children;
  })();

  return (
    <div className={classes.root}>
      <label htmlFor={filterId} className={classes.title}>
        {title}
      </label>
      <div className={classes.valueContainer}>{valueElement}</div>
    </div>
  );
};
