import { Badge, BadgeProps, createStyles } from '@mantine/core';
import { useResizeObserver } from '@mantine/hooks';

import { FloatingPosition } from '@mantine/core/lib/Floating';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

interface StylesProps {
  maxWidth: number | undefined;
  color: string | undefined;
  backgroundColor: string | undefined;
  fullWidth?: boolean;
}

const useStyles = createStyles((_, { maxWidth, color, backgroundColor, fullWidth }: StylesProps) => ({
  leftSection: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    marginLeft: -6,
  },
  rightSection: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    marginRight: -6,
  },
  overflowDiv: { overflow: 'hidden', textOverflow: 'ellipsis' },
  root: {
    width: fullWidth ? '100%' : 'fit-content',
    maxWidth,
    color,
    backgroundColor,
    fontWeight: 500,
  },
  inner: {
    textTransform: 'initial',
  },
}));

const BADGE_OFFSET = 42; // value of default paddings, margins and the close button, i.e. everything else than the text.
export type WhyLabsBadgeProps = Pick<
  BadgeProps,
  'children' | 'className' | 'color' | 'fullWidth' | 'leftSection' | 'radius' | 'rightSection' | 'size' | 'variant'
> & {
  maxWidth?: number;
  customColor?: string;
  customBackground?: string;
  showToolTip?: boolean;
  overrideTooltip?: string;
  tooltipPosition?: FloatingPosition;
};

const WhyLabsBadge = ({
  children,
  maxWidth,
  customColor,
  customBackground,
  radius = 'sm',
  variant = 'filled',
  size = 'md',
  showToolTip = false,
  tooltipPosition,
  overrideTooltip,
  fullWidth,
  ...rest
}: WhyLabsBadgeProps): JSX.Element => {
  const { classes } = useStyles({ maxWidth, color: customColor, backgroundColor: customBackground, fullWidth });
  const [badgeRef, rect] = useResizeObserver();
  const shouldShowTooltip = showToolTip || (maxWidth && rect.width >= maxWidth - BADGE_OFFSET);
  return (
    <WhyLabsTooltip
      label={shouldShowTooltip ? overrideTooltip ?? children : ''}
      position={tooltipPosition}
      openDelay={300}
    >
      <Badge classNames={classes} data-testid="WhyLabsBadge" {...rest} radius={radius} size={size} variant={variant}>
        <div ref={badgeRef}>
          <div className={classes.overflowDiv}>{children}</div>
        </div>
      </Badge>
    </WhyLabsTooltip>
  );
};

export default WhyLabsBadge;
