import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { TitleValueWidget } from './TitleValueWidget';

const { getByTestId, getByText, queryByTestId } = screen;

describe('<TitleValueWidget />', () => {
  it.each(['A title', 'Another title'])('should render title %p', (expected) => {
    getRenderer({ title: expected, children: 'Value' });

    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['A value', 'Another value'])('should render value %p', (expected) => {
    getRenderer({ title: 'Title', children: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['A string value', 123])('should match snapshot for %p value', (expected) => {
    const { container } = getRenderer({ title: 'Title', children: expected });
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot for custom children', () => {
    const { container } = getRenderer({
      title: 'Title',
      children: <div data-testid="custom-children">Custom children</div>,
    });
    expect(container).toMatchSnapshot();
  });

  it('should not render loading skeleton by default', () => {
    getRenderer({ children: 0, title: 'Title' });
    expect(queryByTestId('LoadingSkeleton')).not.toBeInTheDocument();
  });

  it('should render loading skeleton when isLoading=true', () => {
    getRenderer({ children: 0, isLoading: true, title: 'Title' });
    expect(getByTestId('LoadingSkeleton')).toBeInTheDocument();
  });
});

// Helpers
type TestProps = ComponentProps<typeof TitleValueWidget>;

function getRenderer({ children, ...rest }: TestProps) {
  return render(<TitleValueWidget {...rest}>{children}</TitleValueWidget>);
}
