import { act, render, screen, within } from '@testing-library/react';
import userEvent, { Options, PointerEventsCheckLevel } from '@testing-library/user-event';
import { ComponentProps } from 'react';

import KeyValueMultiSelect from './KeyValueMultiSelect';

const { getAllByRole, getByRole, getByTestId, getByText, queryByRole } = screen;
const TEST_ID = 'KeyValueMultiSelect';

const USER_EVENT_CONFIG: Options = {
  // workaround to fix a strange test error with Mantine's Multi Select component
  // https://github.com/testing-library/user-event/issues/662#issuecomment-1462253704
  pointerEventsCheck: PointerEventsCheckLevel.Never,
};

describe('<KeyValueMultiSelect />', () => {
  it("should have default testid 'Select'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A label', 'Another label'])(`should have a searchbox with label '%s'`, (label) => {
    getRenderer({ label });
    expect(getByRole('searchbox', { name: label })).toBeInTheDocument();
  });

  it('should display data options when searchbox is clicked', async () => {
    const data = ['deposit', 'outdoors'];
    getRenderer({ data });

    await clickOnSearchBox();
    expect(getAllByRole('option')).toHaveLength(data.length);
  });

  it("should display 'Keys' as group separator", async () => {
    getRenderer({ data: ['Option A'] });

    await clickOnSearchBox();
    expect(getByRole('separator')).toHaveTextContent('KEYS');
  });

  it.each(['A Key', 'Another Key'])("should display '%p values' as group separator", async (selectedKey) => {
    getRenderer({ data: ['Option A'], selectedKey });

    await clickOnSearchBox();
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

  it("should call onChange callback when a key=value pair is removed by clicking it's remove button", async () => {
    const onChange = jest.fn();
    getRenderer({
      onChange,
      selectedPeers: [
        { key: 'keytodelete', value: 'value' },
        { key: 'keytokeep', value: 'value2' },
      ],
    });

    const buttonParent = getByText('keytodelete=value').parentElement as HTMLElement;
    await userEvent.click(within(buttonParent).getByRole('button'), USER_EVENT_CONFIG);
    expect(onChange).toHaveBeenCalledWith([{ key: 'keytokeep', value: 'value2' }]);
  });

  it('should call onChange callback when a key=value pair is added', async () => {
    const data = ['Option 1', 'Option 2'];

    const onChange = jest.fn();
    getRenderer({ data, onChange, selectedKey: 'theKey', selectedPeers: [] });
    expect(onChange).not.toHaveBeenCalled();

    await clickOnSearchBox();
    await userEvent.click(getByRole('option', { name: data[1] }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ key: 'theKey', value: data[1] }]);
  });

  it("should call setSelectedKey callback when a key is selected from the 'Keys' group", async () => {
    const data = ['Option 1', 'Option 2'];
    const setSelectedKey = jest.fn();
    getRenderer({ data, setSelectedKey, selectedPeers: [] });

    await clickOnSearchBox();
    await userEvent.click(getByRole('option', { name: data[1] }));
    expect(setSelectedKey).toHaveBeenCalledTimes(1);
    expect(setSelectedKey).toHaveBeenCalledWith(data[1]);
  });

  it('should call setSelectedKey callback with empty string when a key is already selected', async () => {
    const data = ['Option 1', 'Option 2'];
    const setSelectedKey = jest.fn();
    getRenderer({ data, setSelectedKey, selectedKey: 'theKey', selectedPeers: [] });

    await clickOnSearchBox();
    await userEvent.click(getByRole('option', { name: data[1] }));
    expect(setSelectedKey).toHaveBeenCalledWith('');
  });

  it("should render 'No options available' when there are no data available", async () => {
    getRenderer({ data: [] });

    await clickOnSearchBox();
    expect(getByText('No options available')).toBeInTheDocument();
  });

  it("should render 'Nothing found' when there are no data available", async () => {
    getRenderer({ data: ['Option 1', 'Option 2'] });

    await userEvent.type(getSearchBox(), 'nothing', USER_EVENT_CONFIG);
    expect(getByText('Nothing found')).toBeInTheDocument();
  });

  describe('when is loading', () => {
    it("should render 'Loading keys...' when there is not selected key", async () => {
      getRenderer({ isLoading: true, selectedKey: '' });

      await clickOnSearchBox();
      expect(getByText('Loading keys...')).toBeInTheDocument();
    });

    it.each(['theKey', 'anotherKey'])(
      "should render 'Loading values for %p...' when there is a selected key",
      async (selectedKey) => {
        getRenderer({ isLoading: true, selectedKey });

        await clickOnSearchBox();
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

async function clickOnSearchBox() {
  return act(async () => {
    await userEvent.click(getSearchBox(), USER_EVENT_CONFIG);
  });
}
