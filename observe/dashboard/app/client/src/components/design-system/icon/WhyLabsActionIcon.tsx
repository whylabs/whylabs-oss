import { ActionIcon, ActionIconProps, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { forwardRef } from 'react';

type StyleProps = {
  borderColor: string;
  color: string;
};

const useStyles = createStyles((_, { borderColor, color }: StyleProps) => ({
  root: {
    backgroundColor: Colors.transparent,
    color,
    '&:hover': {
      backgroundColor: Colors.transparent,
      borderColor,
    },
  },
}));

type ColorProps =
  | {
      color?: 'primary' | 'danger' | 'success';
      customColor?: false;
    }
  | {
      color?: undefined;
      customColor: string;
    };

type TooltipProps =
  | {
      labelAsTooltip?: undefined;
      tooltip?: undefined;
    }
  | {
      labelAsTooltip: true;
      tooltip?: undefined;
    }
  | {
      labelAsTooltip?: undefined;
      tooltip: string;
    };

export type WhyLabsActionIconProps = Pick<ActionIconProps, 'children' | 'className' | 'disabled' | 'loading' | 'size'> &
  ColorProps &
  TooltipProps & {
    id?: string;
    label: string;
    onClick?: () => void;
    tabIndex?: number;
  };

const WhyLabsActionIcon = forwardRef<HTMLButtonElement, WhyLabsActionIconProps>(
  (
    { className, children, color = 'primary', customColor, label, labelAsTooltip, tooltip, ...rest },
    ref,
  ): JSX.Element => {
    const baseColors = ((): StyleProps => {
      if (customColor) return { borderColor: customColor, color: customColor };

      switch (color) {
        case 'danger':
          return { borderColor: Colors.red, color: Colors.red };
        case 'success':
          return { borderColor: Colors.attrColor, color: Colors.attrColor };
        case 'primary':
        default:
          return { borderColor: Colors.secondaryLight700, color: Colors.secondaryLight1000 };
      }
    })();

    const { classes, cx } = useStyles(baseColors);

    const element = (
      <ActionIcon
        className={cx(classes.root, className)}
        data-testid="WhyLabsActionIcon"
        {...rest}
        aria-label={label}
        radius="sm"
        ref={ref}
      >
        {children}
      </ActionIcon>
    );

    if (labelAsTooltip || tooltip) {
      const tooltipLabel = labelAsTooltip ? label : tooltip;
      return <WhyLabsTooltip label={tooltipLabel}>{element}</WhyLabsTooltip>;
    }

    return element;
  },
);

export default WhyLabsActionIcon;
