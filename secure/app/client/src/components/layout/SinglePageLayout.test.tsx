import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { HeaderField, SinglePageLayout } from './SinglePageLayout';

const { getAllByRole, getByRole, getByTestId, queryByRole } = screen;

// Skipped for Hadron
describe.skip('<SinglePageLayout />', () => {
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
});

// Helpers
type Props = ComponentProps<typeof SinglePageLayout>;
function getRenderer({ children = <p>Children</p>, ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <SinglePageLayout {...rest}>{children}</SinglePageLayout>
      </MemoryRouter>
    </MantineProvider>,
  );
}
