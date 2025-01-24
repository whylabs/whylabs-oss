import WhyLabsSegmentedControl, { WhyLabsSegmentedControlProps } from './WhyLabsSegmentedControl';

export type SegmentItemInfo = { color: string; label: JSX.Element; value: string };
export type WhyLabsMulticolorSegmentedControlProps = Omit<WhyLabsSegmentedControlProps, 'data'> & {
  segmentItems: SegmentItemInfo[];
};

export const WhyLabsMulticolorSegmentedControl = ({
  segmentItems,
  onChange,
  ...rest
}: WhyLabsMulticolorSegmentedControlProps): JSX.Element => {
  const data = segmentItems.map(({ color, label, value }) => ({
    color,
    label,
    value,
  }));

  const usedValue = rest.value ?? segmentItems[0]?.value;

  const selectedItem = segmentItems.find((item) => item.value === usedValue);
  const chosenColor = selectedItem?.color ?? segmentItems[0].color;

  const handleValueChange = (newValue: string) => {
    onChange?.(newValue);
  };
  return (
    <WhyLabsSegmentedControl {...rest} value={usedValue} data={data} onChange={handleValueChange} color={chosenColor} />
  );
};
