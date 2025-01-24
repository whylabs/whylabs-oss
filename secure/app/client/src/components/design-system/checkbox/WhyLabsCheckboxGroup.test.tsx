import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WhyLabsCheckboxGroup, { WhyLabsCheckboxGroupOptions, WhyLabsCheckboxGroupProps } from './WhyLabsCheckboxGroup';

const { getAllByRole, getByLabelText, getByRole, getByTestId, getByText, queryByText } = screen;

const TEST_ID = 'WhyLabsCheckboxGroup';
const DEFAULT_LABEL = 'The checkbox group';

describe('<WhyLabsCheckboxGroup />', () => {
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
  ])('should have the correct number of checkboxes %#', (options) => {
    getRenderer({ options });
    expect(getAllByRole('checkbox')).toHaveLength(options.length);
  });

  it('should have the correct label for each checkbox', () => {
    const options = getOptionsList();
    getRenderer({ options });
    options.forEach((option) => {
      expect(getByRole('checkbox', { name: option.label?.toString() })).toBeInTheDocument();
    });
  });

  it('should have checked checkboxes when the value is set', () => {
    const options = getOptionsList();
    getRenderer({ options, value: [options[0].value, options[2].value] });

    expect(getByRole('checkbox', { name: options[0].label?.toString() })).toBeChecked();
    expect(getByRole('checkbox', { name: options[1].label?.toString() })).not.toBeChecked();
    expect(getByRole('checkbox', { name: options[2].label?.toString() })).toBeChecked();
  });

  describe('onChange callback', () => {
    it('should call it when a checkbox is selected', async () => {
      const options = getOptionsList();
      const onChange = jest.fn();

      getRenderer({ onChange, options });
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(getByRole('checkbox', { name: options[0].label?.toString() }));
      expect(onChange).toHaveBeenCalledWith([options[0].value]);

      await userEvent.click(getByRole('checkbox', { name: options[2].label?.toString() }));
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledWith([options[0].value, options[2].value]);
    });

    it('should call it when a checkbox is deselected', async () => {
      const options = getOptionsList();
      const onChange = jest.fn();

      getRenderer({ onChange, options, value: [options[0].value, options[1].value] });
      expect(onChange).not.toHaveBeenCalled();

      await userEvent.click(getByRole('checkbox', { name: options[0].label?.toString() }));
      expect(onChange).toHaveBeenCalledWith([options[1].value]);
    });
  });
});

// Helpers
function getRenderer({
  label = DEFAULT_LABEL,
  options = getOptionsList(),
  ...rest
}: Partial<WhyLabsCheckboxGroupProps> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsCheckboxGroup label={label} options={options} {...rest} />
    </MantineProvider>,
  );
}

function getOptionsList(): WhyLabsCheckboxGroupOptions[] {
  return [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ];
}
