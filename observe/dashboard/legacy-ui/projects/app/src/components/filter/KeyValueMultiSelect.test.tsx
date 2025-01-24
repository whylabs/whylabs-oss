import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import KeyValueMultiSelect from './KeyValueMultiSelect';

const { getAllByRole, getByRole, getByTestId, getByText, queryByRole } = screen;
const TEST_ID = 'KeyValueMultiSelect';

describe('<KeyValueMultiSelect />', () => {
  it("should have default testid 'Select'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])(`should have a searchbox with label '%s'`, (label) => {
    getRenderer({ label });
    expect(getByRole('searchbox', { name: label })).toBeInTheDocument();
  });

  it('should display data options when searchbox is clicked', () => {
    const data = ['deposit', 'outdoors'];
    getRenderer({ data });

    clickOnSearchBox();
    expect(getAllByRole('option')).toHaveLength(data.length);
  });

  it("should display 'Keys' as group separator", () => {
    getRenderer({ data: ['Option A'] });

    clickOnSearchBox();
    expect(getByRole('separator')).toHaveTextContent('KEYS');
  });

  it.each(['A Key', 'Another Key'])("should display '%p values' as group separator", (selectedKey) => {
    getRenderer({ data: ['Option A'], selectedKey });

    clickOnSearchBox();
    expect(getByRole('separator')).toHaveTextContent(`${selectedKey} values`);
  });

  it('should display selected key=value pairs', () => {
    const value = [
      { key: 'key1', value: 'value1' },
      { key: 'UPPERCASE', value: 'Value2' },
      { key: 'Key3', value: 'VALUE3' },
      { key: 'somethingElse', value: 'whatever' },
    ];
    getRenderer({ selectedPeers: value });

    value.forEach((f) => {
      expect(getByText(`${f.key}=${f.value}`)).toBeInTheDocument();
    });
  });

  it('should not display a clear all button when there are no selected key=value pairs', () => {
    getRenderer({ selectedPeers: [] });
    expect(queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it("should call onChange callback when a key=value pair is removed by clicking it's remove button", () => {
    const onChange = jest.fn();
    getRenderer({
      onChange,
      selectedPeers: [
        { key: 'keytodelete', value: 'value' },
        { key: 'keytokeep', value: 'value2' },
      ],
    });

    const buttonParent = getByText('keytodelete=value').parentElement!;
    userEvent.click(within(buttonParent).getByRole('button'));
    expect(onChange).toHaveBeenCalledWith([{ key: 'keytokeep', value: 'value2' }]);
  });

  it('should call onChange callback when a key=value pair is added', () => {
    const data = ['Option 1', 'Option 2'];

    const onChange = jest.fn();
    getRenderer({ data, onChange, selectedKey: 'theKey', selectedPeers: [] });
    expect(onChange).not.toHaveBeenCalled();

    clickOnSearchBox();
    userEvent.click(getByRole('option', { name: data[1] }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ key: 'theKey', value: data[1] }]);
  });

  it("should call setSelectedKey callback when a key is selected from the 'Keys' group", () => {
    const data = ['Option 1', 'Option 2'];
    const setSelectedKey = jest.fn();
    getRenderer({ data, setSelectedKey, selectedPeers: [] });

    clickOnSearchBox();
    userEvent.click(getByRole('option', { name: data[1] }));
    expect(setSelectedKey).toHaveBeenCalledTimes(1);
    expect(setSelectedKey).toHaveBeenCalledWith(data[1]);
  });

  it('should call setSelectedKey callback with empty string when a key is already selected', () => {
    const data = ['Option 1', 'Option 2'];
    const setSelectedKey = jest.fn();
    getRenderer({ data, setSelectedKey, selectedKey: 'theKey', selectedPeers: [] });

    clickOnSearchBox();
    userEvent.click(getByRole('option', { name: data[1] }));
    expect(setSelectedKey).toHaveBeenCalledWith('');
  });

  it("should render 'No options available' when there are no data available", () => {
    getRenderer({ data: [] });

    clickOnSearchBox();
    expect(getByText('No options available')).toBeInTheDocument();
  });

  it("should render 'Nothing found' when there are no data available", () => {
    getRenderer({ data: ['Option 1', 'Option 2'] });

    userEvent.type(getSearchBox(), 'nothing');
    expect(getByText('Nothing found')).toBeInTheDocument();
  });

  describe('when is loading', () => {
    it("should render 'Loading keys...' when there is not selected key", () => {
      getRenderer({ isLoading: true, selectedKey: '' });

      clickOnSearchBox();
      expect(getByText('Loading keys...')).toBeInTheDocument();
    });

    it.each(['theKey', 'anotherKey'])(
      "should render 'Loading values for %p...' when there is a selected key",
      (selectedKey) => {
        getRenderer({ isLoading: true, selectedKey });

        clickOnSearchBox();
        expect(getByText(`Loading values for ${selectedKey}...`)).toBeInTheDocument();
      },
    );
  });
});

// Helpers
type Props = ComponentProps<typeof KeyValueMultiSelect>;
function getRenderer({
  data = [],
  label = 'The label',
  onChange = jest.fn(),
  selectedKey = '',
  setSelectedKey = jest.fn(),
  selectedPeers = [],
  ...rest
}: Partial<Props> = {}) {
  return render(
    <KeyValueMultiSelect
      data={data}
      label={label}
      onChange={onChange}
      selectedKey={selectedKey}
      setSelectedKey={setSelectedKey}
      selectedPeers={selectedPeers}
      {...rest}
    />,
  );
}

function getSearchBox() {
  return getByRole('searchbox');
}

function clickOnSearchBox() {
  return userEvent.click(getSearchBox());
}
