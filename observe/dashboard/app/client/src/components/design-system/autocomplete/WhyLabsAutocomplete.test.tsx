import { MantineProvider } from '@mantine/core';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';

import WhyLabsAutocomplete from './WhyLabsAutocomplete';

const {
  getAllByRole,
  getByPlaceholderText,
  getByLabelText,
  getByRole,
  getByTestId,
  getByText,
  queryAllByRole,
  queryByText,
} = screen;

const TEST_ID = 'WhyLabsAutocomplete';
const DEFAULT_LABEL = 'Autocomplete label';

describe('<WhyLabsAutocomplete />', () => {
  it("should have default testid 'WhyLabsAutocomplete'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])('should render a combobox with label %p', (expected) => {
    getRenderer({ label: expected });
    expect(getByRole('combobox', { name: expected })).toBeInTheDocument();
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

  it.each(['A placeholder', 'Another placeholder'])('should render a searchbox with placeholder %p', (placeholder) => {
    getRenderer({ placeholder });
    expect(getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it.each(['a value', 'another value'])('should render a searchbox with a value %p', (value) => {
    getRenderer({ value });
    expect(getByRole('combobox')).toHaveValue(value);
  });

  it('should display options', async () => {
    const data = ['a', 'b', 'c'];
    getRenderer({ data });

    await userEvent.click(getByRole('combobox'));
    expect(getByRole('listbox')).toBeInTheDocument();
    expect(getAllByRole('option')).toHaveLength(data.length);
  });

  it.each(['nothing found message', 'another message'])(
    'should display nothingFound message %p when no options are available',
    async (nothingFound) => {
      getRenderer({ data: [], nothingFound });

      await userEvent.click(getByRole('combobox'));
      expect(getByText(nothingFound)).toBeInTheDocument();
    },
  );

  it('should display a right section', () => {
    const rightSection = <p>right section</p>;
    getRenderer({ rightSection });

    expect(getByText('right section')).toBeInTheDocument();
  });

  it('should display a icon', () => {
    const icon = <p>icon</p>;
    getRenderer({ icon });

    expect(getByText('icon')).toBeInTheDocument();
  });

  it('should call onChange callback when value changes', async () => {
    const searchText = 'a text';
    const onChange = jest.fn();
    getRenderer({ onChange });
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.type(getByRole('combobox'), searchText);
    expect(onChange).toHaveBeenCalledTimes(searchText.length);
  });

  it('should call onChange callback when an option is clicked', async () => {
    const data = ['Option A', 'Option B', 'Option C'];
    const onChange = jest.fn();
    getRenderer({ data, onChange });

    await userEvent.click(getByRole('combobox'));
    await userEvent.click(getByText('Option A'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('Option A');
  });

  it('should filter options when a value is typed', async () => {
    const data = ['Adrain', 'Jany', 'Brandon'];
    getRenderer({ data });

    await userEvent.type(getByRole('combobox'), 'ra');
    expect(getAllByRole('option')).toHaveLength(2);

    await userEvent.type(getByRole('combobox'), 'n');
    expect(getAllByRole('option')).toHaveLength(1);
  });

  it("should display 'no results' message when no options are available", async () => {
    const data = ['Adrain', 'Jany', 'Brandon'];
    getRenderer({ data, nothingFound: 'No results' });

    act(() => getByRole('combobox').focus());
    await userEvent.paste('something else');
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(getByText('No results')).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsAutocomplete>;
function getRenderer({ data = [], label = DEFAULT_LABEL, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsAutocomplete {...rest} data={data} label={label} />
    </MantineProvider>,
  );
}
