import { Text, TextProps, createStyles } from '@mantine/core';

import { TooltipWrapper } from '../tooltip/TooltipWrapper';

export type WhyLabsTextProps = TextProps & {
  component?: 'p' | 'span';
  displayTooltip?: boolean;
  id?: string;
};

const useStyles = createStyles({
  defaultFormat: {
    margin: 'unset',
    display: 'block',
  },
});

const WhyLabsText = ({
  component = 'span',
  children,
  displayTooltip,
  size = 16,
  className,
  ...rest
}: WhyLabsTextProps): JSX.Element => {
  const { classes, cx } = useStyles();
  return (
    <TooltipWrapper displayTooltip={displayTooltip} label={children} maxWidth={400}>
      <Text
        component={component}
        data-testid="WhyLabsText"
        className={cx(classes.defaultFormat, className)}
        {...rest}
        size={size}
      >
        {children}
      </Text>
    </TooltipWrapper>
  );
};

export default WhyLabsText;
