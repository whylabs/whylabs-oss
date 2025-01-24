import { Colors } from '~/assets/Colors';

import WhyLabsSegmentedControl, { WhyLabsSegmentedControlProps } from './WhyLabsSegmentedControl';

export type SegmentItemInfo = { color: string; label: JSX.Element; value: string };
export type WhyLabsMulticolorSegmentedControlProps = Omit<WhyLabsSegmentedControlProps, 'data'> & {
  segmentItems: SegmentItemInfo[];
};

const colorsMap = new Map<string, { background: string; color: string }>([
  ['red', { background: Colors.red, color: 'white' }],
  ['blue', { background: Colors.chartBlue, color: 'white' }],
  ['orange', { background: Colors.chartOrange, color: 'white' }],
]);

export const WhyLabsMulticolorSegmentedControl = ({
  segmentItems,
  onChange,
  disabled,
  disabledTooltip,
  ...rest
}: WhyLabsMulticolorSegmentedControlProps): JSX.Element => {
  const data = segmentItems.map(({ color, label, value }) => ({
    label,
    value,
  }));

  const usedValue = rest.value ?? segmentItems[0]?.value;

  const selectedItem = segmentItems.find((item) => item.value === usedValue);
  const chosenColor = (() => {
    const color = selectedItem?.color ?? segmentItems[0].color;
    const customActiveColor = colorsMap.get(color);
    return { customActiveColor, color: !customActiveColor ? color : undefined };
  })();

  const handleValueChange = (newValue: string) => {
    onChange?.(newValue);
  };
  return (
    <WhyLabsSegmentedControl
      {...rest}
      value={usedValue}
      data={data}
      onChange={handleValueChange}
      disabled={disabled}
      disabledTooltip={disabledTooltip}
      {...chosenColor}
    />
  );
};
