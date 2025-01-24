import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { WhyLabsBreadCrumbs } from './WhyLabsBreadCrumbs';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsBreadCrumbs';

const crumbs = [
  { title: 'test', href: '#' },
  { title: 'foo', href: '#' },
  { title: 'bar', href: '#' },
];

describe('<WhyLabsBreadCrumbs />', () => {
  it("should have default testid 'WhyLabsBreadCrumbs'", () => {
    getRenderer({ items: [] });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it(`should render crumbs`, () => {
    getRenderer({ items: crumbs });
    expect(getByText(crumbs[0].title)).toBeInTheDocument();
    expect(getByText(crumbs[1].title)).toBeInTheDocument();
    expect(getByText(crumbs[2].title)).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsBreadCrumbs>;
function getRenderer({ items }: Props) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <WhyLabsBreadCrumbs items={items} />
      </MemoryRouter>
    </MantineProvider>,
  );
}
