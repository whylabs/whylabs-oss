import { act, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import GlobalLoader from './GlobalLoader';

const { getByTestId, queryByTestId } = screen;

describe('<GlobalLoader />', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });

    jest.useRealTimers();
  });

  it('should render default loader', async () => {
    getRenderer();
    expect(getByTestId('GlobalLoader')).toBeInTheDocument();
  });

  it('should render whole screen loader', async () => {
    getRenderer({ wholeScreen: true });
    expect(getByTestId('GlobalLoaderWholeScreen')).toBeInTheDocument();
  });

  describe('with interval', () => {
    it("should render nothing when the interval hasn't passed yet", () => {
      getRenderer({ interval: 100 });

      act(() => {
        jest.runTimersToTime(90);
      });
      expect(queryByTestId('GlobalLoader')).not.toBeInTheDocument();
    });

    it('should render loader after interval passed', () => {
      getRenderer({ interval: 200 });

      act(() => {
        jest.runTimersToTime(201);
      });
      expect(getByTestId('GlobalLoader')).toBeInTheDocument();
    });
  });
});

// Helpers
function getRenderer(props: ComponentProps<typeof GlobalLoader> = {}) {
  return render(<GlobalLoader {...props} />);
}
