import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ComponentProps } from 'react';
import { DefaultTabBarArea } from './DefaultTabBarArea';

const { getByRole, getByText } = screen;

describe('<DefaultTabBarArea />', () => {
  it.each(['A title', 'Another title'])('should render title %p', (title) => {
    getRenderer({ title });
    expect(getByText(title)).toBeInTheDocument();
  });

  it.each(['Button A', 'Button B'])('should render pre-title element %p', (label) => {
    getRenderer({ preTitleChildren: <button type="button">{label}</button> });
    expect(getByRole('button', { name: label })).toBeInTheDocument();
  });

  it.each(['A children text', 'Another children text'])('should render children %p', (children) => {
    getRenderer({ children });
    expect(getByText(children)).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof DefaultTabBarArea>;
function getRenderer({ title = 'The title', ...rest }: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <DefaultTabBarArea {...rest} title={title} />
    </MantineProvider>,
  );
}
