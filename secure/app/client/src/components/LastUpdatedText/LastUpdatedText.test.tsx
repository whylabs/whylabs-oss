import { MantineProvider } from '@mantine/core';
import { act, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { LastUpdatedText } from './LastUpdatedText';

const { getByText } = screen;

describe('<LastUpdatedText />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-31T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should update the displayed text as time passes', () => {
    getRenderer({ updatedAt: new Date() });

    act(() => jest.advanceTimersByTime(5000));
    expect(getByText(/last updated less than 10 seconds ago/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(50000));
    expect(getByText(/last updated less than a minute ago/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(60000));
    expect(getByText(/last updated 2 minutes ago/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(60000 * 30));
    expect(getByText(/last updated 32 minutes ago/i)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(60000 * 120));
    expect(getByText(/last updated about 3 hours ago/i)).toBeInTheDocument();
  });

  it('should update the displayed text when the `updatedAt` prop changes', () => {
    const { rerender } = getRenderer({ updatedAt: new Date() });

    act(() => jest.advanceTimersByTime(60000));
    expect(getByText(/last updated 1 minute ago/i)).toBeInTheDocument();

    rerender(<LastUpdatedText updatedAt={new Date()} />);
    expect(getByText(/last updated less than 5 seconds ago/i)).toBeInTheDocument();
  });
});

// Helpers
type Props = ComponentProps<typeof LastUpdatedText>;
function getRenderer(props: Props) {
  return render(
    <MantineProvider>
      <LastUpdatedText {...props} />
    </MantineProvider>,
  );
}
