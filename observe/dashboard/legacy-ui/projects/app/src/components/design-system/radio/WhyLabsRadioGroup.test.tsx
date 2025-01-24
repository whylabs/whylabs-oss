import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhyLabsRadioGroup, { WhyLabsRadioGroupProps, WhyLabsRadioGroupOptions } from './WhyLabsRadioGroup';

const { getAllByRole, getByLabelText, getByRole, getByTestId, getByText, queryByText } = screen;

const TEST_ID = 'WhyLabsRadioGroup';
const DEFAULT_LABEL = 'The radio group';

describe('<WhyLabsRadioGroup />', () => {
  it('should have default testid', () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have label %p', (label) => {
    getRenderer({ label });
    expect(getByText(label)).toBeInTheDocument();
  });

  it("should display the label when 'hideLabel' is false", () => {
    getRenderer({ hideLabel: false });
    expect(getByText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("should hide the label when 'hideLabel' is true", () => {
    getRenderer({ hideLabel: true });
    expect(queryByText(DEFAULT_LABEL)).not.toBeInTheDocument();
    expect(getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it.each([
    [[{ label: 'Option 1', value: '1' }]],
    [
      [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ],
    ],
  ])('should have the correct number of radioes %#', (options) => {
    getRenderer({ options });
    expect(getAllByRole('radio')).toHaveLength(options.length);
  });

  it('should have the correct label for each radio', () => {
    const options = getOptionsList();
    getRenderer({ options });
    options.forEach((option) => {
      expect(getByRole('radio', { name: option.label?.toString() })).toBeInTheDocument();
    });
  });

  it('should have checked radioes when the value is set', () => {
    const options = getOptionsList();
    getRenderer({ options, value: options[0].value });

    expect(getByRole('radio', { name: options[0].label?.toString() })).toBeChecked();
    expect(getByRole('radio', { name: options[1].label?.toString() })).not.toBeChecked();
    expect(getByRole('radio', { name: options[2].label?.toString() })).not.toBeChecked();
  });

  describe('onChange callback', () => {
    it('should call it when a radio is selected', () => {
      const options = getOptionsList();
      const onChange = jest.fn();

      getRenderer({ onChange, options });
      expect(onChange).not.toHaveBeenCalled();

      userEvent.click(getByRole('radio', { name: options[0].label?.toString() }));
      expect(onChange).toHaveBeenCalledWith(options[0].value);

      userEvent.click(getByRole('radio', { name: options[2].label?.toString() }));
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledWith(options[2].value);
    });

    it('should don`t call onChange on click the selected radio', async () => {
      const options = getOptionsList();
      const onChange = jest.fn();

      getRenderer({ onChange, options, value: options[0].value });
      expect(onChange).not.toHaveBeenCalled();

      userEvent.click(getByRole('radio', { name: options[0].label?.toString() }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

// Helpers
function getRenderer({
  label = DEFAULT_LABEL,
  options = getOptionsList(),
  ...rest
}: Partial<WhyLabsRadioGroupProps> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsRadioGroup label={label} options={options} {...rest} />
    </MantineProvider>,
  );
}

function getOptionsList(): WhyLabsRadioGroupOptions[] {
  return [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ];
}
