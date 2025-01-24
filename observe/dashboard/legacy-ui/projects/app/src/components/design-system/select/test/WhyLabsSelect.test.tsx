import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import WhyLabsSelect from '../WhyLabsSelect';

const {
  getAllByRole,
  getByLabelText,
  getByPlaceholderText,
  getByRole,
  getByTestId,
  getByText,
  queryByRole,
  queryByText,
} = screen;

const TEST_ID = 'WhyLabsSelect';
const DEFAULT_LABEL = 'Select input';

describe('<WhyLabsSelect />', () => {
  it("should have default testid 'Select'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have role', () => {
    getRenderer();
    expect(getByRole('combobox')).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have label %p', (label) => {
    getRenderer({ label });
    expect(getByLabelText(label)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should have default placeholder based on label %p', (label) => {
    getRenderer({ label });
    expect(getByPlaceholderText(`Select ${label.toLowerCase()}`)).toBeInTheDocument();
  });

  it.each(['some-id', 'another-id'])('should have id %p', (id) => {
    getRenderer({ id });
    expect(getByLabelText(DEFAULT_LABEL)).toHaveAttribute('id', id);
  });

  it("should display the label when 'hideLabel' is false", () => {
    getRenderer({ hideLabel: false });
    expect(getByText(DEFAULT_LABEL)).toBeInTheDocument();
    expect(getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it("should hide the label when 'hideLabel' is true", () => {
    getRenderer({ hideLabel: true });
    expect(queryByText(DEFAULT_LABEL)).not.toBeInTheDocument();
    expect(getByLabelText(DEFAULT_LABEL)).toBeInTheDocument();
  });

  it.each(['A placeholder', 'Another placeholder'])('should have placeholder %p', (placeholder) => {
    getRenderer({ placeholder });
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it('should be searchable', () => {
    getRenderer({ searchable: true });
    expect(getByRole('searchbox')).toBeInTheDocument();
  });

  it('should be valid', () => {
    getRenderer({ error: undefined });
    expect(getByRole('searchbox')).toBeValid();
  });

  it.each(['Please select something', 'Another error'])('should be invalid with error message %p', (expected) => {
    getRenderer({ error: expected });
    expect(getByRole('searchbox')).toBeInvalid();
    expect(getByText(expected)).toBeInTheDocument();
  });

  it('should be invalid with a boolean error', () => {
    getRenderer({ error: true });
    expect(getByRole('searchbox')).toBeInvalid();
  });

  it('should allow user to type in the searchbox', () => {
    getRenderer();

    const selectElement = getByRole('searchbox');
    userEvent.type(selectElement, 'so patate');
    expect(selectElement).toHaveValue('so patate');
  });

  it('should have options', async () => {
    const data = defaultList();
    getRenderer({ data });
    userEvent.click(getByLabelText(DEFAULT_LABEL));

    expect(getAllByRole('option')).toHaveLength(data.length);
  });

  it('should not have a clear button when value is undefined', () => {
    const data = defaultList();

    getRenderer({ clearable: true, data, label: 'Something', value: undefined });
    expect(queryByRole('button', { name: /clear something/i })).not.toBeInTheDocument();
  });

  it('shouldn not have a clear button when clearable=false', () => {
    const data = defaultList();

    getRenderer({ clearable: false, data, label: 'Something', value: data[0].value });
    expect(queryByRole('button', { name: /clear something/i })).not.toBeInTheDocument();
  });

  it('should have a clear button', () => {
    const data = defaultList();

    getRenderer({ clearable: true, data, label: 'Something', value: data[0].value });
    expect(getByRole('button')).toBeInTheDocument();
  });

  it('should display default nothing found message', () => {
    const data = defaultList();

    getRenderer({ data });
    userEvent.type(getByRole('searchbox'), `something wrong`);
    expect(getByText('Nothing found')).toBeInTheDocument();
  });

  it.each(['nothing', 'nothing to display'])('should display custom nothing found message %p', (expected) => {
    const data = defaultList();

    getRenderer({ data, nothingFound: expected });
    userEvent.type(getByRole('searchbox'), `something wrong`);
    expect(getByText(expected)).toBeInTheDocument();
  });

  it("shouldn't display label tooltip button by default", () => {
    getRenderer({ label: 'Something', labelTooltip: undefined });
    expect(queryByRole('button', { name: '?' })).not.toBeInTheDocument();
  });

  it('should display label tooltip button', () => {
    getRenderer({ label: 'Something', labelTooltip: 'A tooltip' });
    expect(getByRole('button', { name: '?' })).toBeInTheDocument();
  });

  it("shouldn't display label tooltip button when label is hidden", () => {
    getRenderer({ hideLabel: true, label: 'Something', labelTooltip: 'A tooltip' });
    expect(queryByRole('button', { name: '?' })).not.toBeInTheDocument();
  });

  it.each(['A tooltip', 'Another tooltip'])('should display label tooltip', (expected) => {
    getRenderer({ label: 'Something', labelTooltip: expected });

    userEvent.hover(getByRole('button', { name: '?' }));
    expect(getByRole('tooltip', { name: expected })).toBeInTheDocument();
  });

  describe('while loading is true', () => {
    it("should have 'Loading...' as placeholder", () => {
      getRenderer({ loading: true });
      expect(getByPlaceholderText('Loading...')).toBeInTheDocument();
    });

    it("should have 'Loading...' as nothing found message", () => {
      getRenderer({ loading: true });

      userEvent.click(getByLabelText(DEFAULT_LABEL));
      expect(getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('onChange callback', () => {
    it('should call it when the user selects an option', () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ data, onChange });
      expect(onChange).not.toHaveBeenCalled();

      userEvent.click(getByLabelText(DEFAULT_LABEL));
      userEvent.click(getByRole('option', { name: data[0].label }));
      expect(onChange).toHaveBeenCalledTimes(1);

      userEvent.click(getByLabelText(DEFAULT_LABEL));
      userEvent.click(getByRole('option', { name: data[2].label }));
      expect(onChange).toHaveBeenCalledTimes(2);

      expect(onChange).toHaveBeenNthCalledWith(1, data[0].value);
      expect(onChange).toHaveBeenNthCalledWith(2, data[2].value);
    });

    it('should call it when the user clears the value', () => {
      const onChange = jest.fn();
      const data = defaultList();

      getRenderer({ clearable: true, data, label: 'Anything', onChange, value: data[1].value });
      expect(onChange).not.toHaveBeenCalled();

      userEvent.click(getByRole('button'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('should call it when user type in the searchbox and select the item using keyboard', () => {
      const onChange = jest.fn();
      const data = defaultList();
      getRenderer({ data, onChange });

      userEvent.type(getByRole('searchbox'), `${data[1].label}{arrowdown}{enter}`);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(data[1].value);
    });
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsSelect>;
function getRenderer({ data = [], label = DEFAULT_LABEL, value, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsSelect data={data} value={value ?? null} label={label} {...rest} />
    </MantineProvider>,
  );
}

function defaultList() {
  return [
    { label: 'A label', value: 'a-value' },
    { label: 'B label', value: 'b-value' },
    { label: 'C label', value: 'c-value' },
  ];
}
