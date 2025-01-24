import externalLinks from 'constants/externalLinks';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import ExternalLink from './ExternalLink';

const { getByRole } = screen;

describe('<ExternalLink />', () => {
  it.each(['Children', 'Another children'])('should render children %p', (expected) => {
    getRenderer({ children: expected });
    expect(getByRole('link', { name: expected })).toBeInTheDocument();
  });

  it.each(Object.keys(externalLinks))('should have href=%p', (expected) => {
    const key = expected as keyof typeof externalLinks;

    getRenderer({ to: key });
    expect(getByRole('link')).toHaveAttribute('href', externalLinks[key]);
  });

  it('should have target="__blank"', () => {
    getRenderer();
    expect(getByRole('link')).toHaveAttribute('target', '__blank');
  });

  it('should have rel="noopener noreferrer"', () => {
    getRenderer();
    expect(getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['a-class', 'another-class'])('should have class %p', (expected) => {
    getRenderer({ className: expected });
    expect(getByRole('link')).toHaveClass(expected);
  });
});

// Helpers
type TestProps = ComponentProps<typeof ExternalLink>;

function getRenderer({ children = 'The link', to = 'pricing', ...rest }: Partial<TestProps> = {}) {
  return render(
    <ExternalLink to={to} {...rest}>
      {children}
    </ExternalLink>,
  );
}
