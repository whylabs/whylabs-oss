import { Tooltip, TooltipProps, createStyles } from '@mantine/core';

export type WhyLabsTooltipProps = {
  maxWidth?: number;
  wrapChildren?: boolean;
  withinPortal?: boolean;
} & Pick<TooltipProps, 'position' | 'children' | 'label' | 'withinPortal' | 'openDelay'>;

const useTooltipStyles = createStyles((_, maxWidth: number | undefined) => ({
  tooltip: { fontSize: 11, maxWidth: maxWidth ? `${maxWidth}px` : undefined },
  wrapper: {
    overflow: 'inherit',
    textOverflow: 'inherit',
    display: 'inherit',
    flexDirection: 'inherit',
  },
}));

const WhyLabsTooltip = ({
  children,
  label,
  position = 'bottom',
  maxWidth,
  wrapChildren = true,
  withinPortal = true,
  ...rest
}: WhyLabsTooltipProps): JSX.Element => {
  const {
    classes: { tooltip, wrapper },
  } = useTooltipStyles(maxWidth);
  return (
    <Tooltip
      label={label}
      hidden={!label}
      multiline
      withinPortal={withinPortal}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- max-content is a valid value which fix tooltip breaking lines when it has space to render
      width="max-content"
      radius="sm"
      {...rest}
      color="gray"
      zIndex={999}
      position={position}
      classNames={{ tooltip }}
    >
      {wrapChildren ? <div className={wrapper}>{children}</div> : children}
    </Tooltip>
  );
};

export default WhyLabsTooltip;
