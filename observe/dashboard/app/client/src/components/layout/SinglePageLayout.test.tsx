import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useFlags } from '~/hooks/useFlags';
import { FALSE_FLAGS } from '~/utils/testUtils';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { HeaderField, SinglePageLayout } from './SinglePageLayout';

const { getAllByRole, getByRole, getByTestId, getByText, queryByRole } = screen;

jest.mock('~/hooks/useFlags');
const mockUseFlags = useFlags as jest.MockedFunction<typeof useFlags>;

jest.mock('../design-system/banner/DemoWarningBar', () => ({
  DemoWarningBar: () => <p>DemoWarningBar</p>,
}));

jest.mock('../buttons/WhoAmI', () => ({
  WhoAmI: () => <p>WhoAmI</p>,
}));

jest.mock('../design-system/banner/ImpersonationWarningBar', () => ({
  ImpersonationWarningBar: () => <p>ImpersonationWarningBar</p>,
}));

describe('<SinglePageLayout />', () => {
  beforeAll(() => {
    mockUseFlags.mockReturnValue({ ...FALSE_FLAGS, settingsPage: true });
  });

  it('should render the SinglePageHeader component', () => {
    getRenderer();
    expect(getByTestId('SinglePageHeader')).toBeInTheDocument();
  });

  it('should render main with class', () => {
    getRenderer();
    expect(getByRole('main')).toHaveClass('mantine-AppShell-main');
  });

  it.each(['A children', 'Another children'])("should render children '%s' inside main element", (expected) => {
    getRenderer({ children: <p>{expected}</p> });

    const mainElement = getByRole('main');
    expect(within(mainElement).getByText(expected)).toBeInTheDocument();
  });

  it('should render header all select fields', () => {
    const headerFields: HeaderField[] = [
      { data: [], label: 'First', type: 'select', value: null },
      { data: [], label: 'Second', type: 'select', value: null },
      { data: [], label: 'Third', type: 'select', value: null },
    ];
    getRenderer({ headerFields });
    expect(getAllByRole('searchbox')).toHaveLength(headerFields.length);

    headerFields.forEach((headerField) => {
      expect(getByRole('searchbox', { name: headerField.label?.toString() })).toBeInTheDocument();
    });
  });

  it('should not render page title', () => {
    getRenderer();
    expect(queryByRole('heading')).not.toBeInTheDocument();
  });

  it.each(['A title', 'Another title'])('should render page title %p', (pageTitle) => {
    getRenderer({ pageTitle });
    expect(getByRole('heading', { name: pageTitle })).toBeInTheDocument();
  });

  it('should render close button', () => {
    const onClosePage = jest.fn();
    getRenderer({ onClosePage });

    expect(getByRole('button', { name: /^close page$/i })).toBeInTheDocument();
  });

  it('should call onClosePage when close button is clicked', async () => {
    const onClosePage = jest.fn();
    getRenderer({ onClosePage });
    expect(onClosePage).not.toHaveBeenCalled();

    await userEvent.click(getByRole('button', { name: /^close page$/i }));
    await userEvent.click(getByRole('button', { name: /^close page$/i }));
    expect(onClosePage).toHaveBeenCalledTimes(2);
  });

  it('should render demo warning bar', () => {
    getRenderer();
    expect(getByText('DemoWarningBar')).toBeInTheDocument();
  });

  it('should render impersonation warning bar', () => {
    getRenderer();
    expect(getByText('ImpersonationWarningBar')).toBeInTheDocument();
  });

  it('should render WhoAmI button', () => {
    getRenderer();
    expect(getByText('WhoAmI')).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof SinglePageLayout>;
function getRenderer({ children = <p>Children</p>, onClosePage = jest.fn(), ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <SinglePageLayout onClosePage={onClosePage} {...rest}>
          {children}
        </SinglePageLayout>
      </MemoryRouter>
    </MantineProvider>,
  );
}
