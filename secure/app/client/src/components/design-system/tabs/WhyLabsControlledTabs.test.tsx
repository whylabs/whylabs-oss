import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { getSelectedTabContent } from '~/utils/testingUtils';

import { getTestTabs } from './mocks/getTestTabs';
import { WhyLabsControlledTabs } from './WhyLabsControlledTabs';

const { getAllByRole, getByRole, getByTestId, getByText } = screen;

const TEST_TABS = [...getTestTabs()];

const TABS_LABELS = TEST_TABS.map(({ label }) => label);

describe('<WhyLabsControlledTabs />', () => {
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

  it('should call onTabChange callback when user change the current tab', async () => {
    const tabs = TEST_TABS;
    const onTabChange = jest.fn();

    getRenderer({ tabs, onTabChange });
    expect(onTabChange).not.toHaveBeenCalled();

    await userEvent.click(getByText(tabs[2].label));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenNthCalledWith(1, tabs[2].label);

    await userEvent.click(getByText(tabs[1].label));
    expect(onTabChange).toHaveBeenCalledTimes(2);
    expect(onTabChange).toHaveBeenNthCalledWith(2, tabs[1].label);
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
