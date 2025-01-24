import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { WhyLabsContextMenu } from '../WhyLabsContextMenu';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsContextMenu';

describe('<WhyLabsContextMenu />', () => {
  it("should have default testid 'WhyLabsContextMenu'", () => {
    getRenderer();
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it('should have items', () => {
    const items = defaultList();
    getRenderer({ items, opened: true });
    expect(getByText(items[0].label)).toBeInTheDocument();
    expect(getByText(items[1].label)).toBeInTheDocument();
    expect(getByText(items[2].label)).toBeInTheDocument();
  });

  it('should have Sections', () => {
    const items = defaultSectionedList();
    getRenderer({ items, opened: true });
    expect(getByText(items[0].section)).toBeInTheDocument();
    expect(getByText(items[1].section)).toBeInTheDocument();
    expect(getByText(items[2].section)).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsContextMenu>;
function getRenderer({ items = [], ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <WhyLabsContextMenu items={items} {...rest} />
    </MantineProvider>,
  );
}

function defaultSectionedList() {
  return [
    {
      label: 'A label',
      section: 'First section',
      onClick: jest.fn(),
    },
    {
      label: 'B label',
      section: 'First section',
      onClick: jest.fn(),
    },
    {
      label: 'C label',
      section: 'Other section',
      onClick: jest.fn(),
    },
  ];
}

function defaultList() {
  return [
    {
      label: 'A label',
      onClick: () => {
        /**/
      },
    },
    {
      label: 'B label',
      onClick: () => {
        /**/
      },
    },
    {
      label: 'C label',
      onClick: () => {
        /**/
      },
    },
  ];
}
