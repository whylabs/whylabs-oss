import { createStyles, Tooltip, TooltipProps } from '@mantine/core';

export type WhyLabsTooltipProps = {
  maxWidth?: number;
  wrapChildren?: boolean;
  withinPortal?: boolean;
} & Pick<TooltipProps, 'position' | 'children' | 'label' | 'withinPortal' | 'openDelay' | 'className'>;

const useTooltipStyles = createStyles((_, maxWidth: number | undefined) => ({
  tooltip: { fontSize: 11, maxWidth: `${maxWidth}px`, wordBreak: 'break-word' },
  wrapper: {
    overflow: 'inherit',
    textOverflow: 'inherit',
    display: 'inherit',
    flexDirection: 'inherit',
    flex: 'inherit',
  },
}));

const WhyLabsTooltip = ({
  children,
  label,
  position = 'bottom',
  maxWidth,
  wrapChildren = true,
  withinPortal = true,
  openDelay,
  className,
  ...rest
}: WhyLabsTooltipProps): JSX.Element => {
  const {
    classes: { tooltip, wrapper },
    cx,
  } = useTooltipStyles(maxWidth);
  return (
    <Tooltip
      label={label}
      hidden={!label}
      multiline
      withinPortal={withinPortal}
      radius="sm"
      {...rest}
      color="gray"
      zIndex={999}
      position={position}
      classNames={{ tooltip }}
      openDelay={openDelay}
    >
      {wrapChildren ? <div className={cx(wrapper, className)}>{children}</div> : children}
    </Tooltip>
  );
};

export default WhyLabsTooltip;
