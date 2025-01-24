import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { getSelectedTabContent } from 'utils/testingUtils';
import userEvent from '@testing-library/user-event';
import { getTestTabs } from './mocks/getTestTabs';
import { WhyLabsControlledTabs } from './WhyLabsControlledTabs';

const { getAllByRole, getByRole, getByTestId, getByText, queryByTestId } = screen;

const TEST_TABS = [...getTestTabs()];

const TABS_LABELS = TEST_TABS.map(({ label }) => label);

describe('<WhyLabsControlledTabs />', () => {
  it('should not render anything if there are no tabs', () => {
    const { container } = getRenderer({ tabs: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [[{ label: 'Characteristics' }, { label: 'Timeline' }]],
    [[{ label: 'Notes' }, { label: 'Financial' }, { label: 'Listing' }, { label: 'Medical' }]],
  ])('should display all tabs %#', (tabs) => {
    getRenderer({ tabs });
    expect(getAllByRole('tab')).toHaveLength(tabs.length);
    tabs.forEach(({ label }) => expect(getByRole('tab', { name: label })).toBeInTheDocument());
  });

  it('should render first tab content by default', () => {
    getRenderer({ tabs: TEST_TABS });
    expect(getSelectedTabContent()).toBe(TEST_TABS[0].label);
    expect(getByTestId(`${TEST_TABS[0].label}TabContent`)).toBeInTheDocument();
  });

  it.each(TABS_LABELS)('should render with content for tab=%p', (label) => {
    const tabs = TEST_TABS;
    getRenderer({
      activeTab: label,
      tabs,
    });
    expect(getSelectedTabContent()).toBe(label);
    expect(getByTestId(`${label}TabContent`)).toBeInTheDocument();
  });

  it('should call onTabChange callback when user change the current tab', () => {
    const tabs = TEST_TABS;
    const onTabChange = jest.fn();

    getRenderer({ tabs, onTabChange });
    expect(onTabChange).not.toHaveBeenCalled();

    userEvent.click(getByText(tabs[2].label));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenNthCalledWith(1, tabs[2].label);

    userEvent.click(getByText(tabs[1].label));
    expect(onTabChange).toHaveBeenCalledTimes(2);
    expect(onTabChange).toHaveBeenNthCalledWith(2, tabs[1].label);
  });

  it('should render disabled tab', () => {
    const tabs = TEST_TABS.map((tab, index) => ({
      ...tab,
      disabled: index % 2 === 0,
    }));
    getRenderer({ tabs });

    const disabledTabs = tabs.filter((tab) => tab.disabled);
    disabledTabs.forEach((tab) => {
      expect(getByRole('tab', { name: tab.label })).toHaveAttribute('aria-disabled', 'true');
      expect(getByRole('tab', { name: tab.label })).toBeDisabled();
    });
  });

  it('should use tab value instead of label to match as active when it is present', () => {
    const tabs = [
      {
        children: <div data-testid="NotesTabContent" />,
        label: 'Notes',
        value: 'notes-value',
      },
      {
        children: <div data-testid="TutorialsTabContent" />,
        label: 'Tutorials',
        value: 'tutorials-value',
      },
    ];

    getRenderer({ activeTab: tabs[1].value, tabs });
    expect(getByTestId(`${tabs[1].label}TabContent`)).toBeInTheDocument();
  });

  it('should not use tab label to match as active when the value is present', () => {
    const tabs = [
      {
        children: <div data-testid="NotesTabContent" />,
        label: 'Notes',
        value: 'notes-value',
      },
      {
        children: <div data-testid="TutorialsTabContent" />,
        label: 'Tutorials',
        value: 'tutorials-value',
      },
    ];

    getRenderer({ activeTab: tabs[1].label, tabs });
    expect(queryByTestId(`${tabs[1].label}TabContent`)).not.toBeInTheDocument();
  });
});

function getRenderer({
  onTabChange = jest.fn(),
  tabs = [],
  ...rest
}: Partial<ComponentProps<typeof WhyLabsControlledTabs>>) {
  return render(
    <MantineProvider>
      <WhyLabsControlledTabs onTabChange={onTabChange} tabs={tabs} {...rest} />
    </MantineProvider>,
  );
}
