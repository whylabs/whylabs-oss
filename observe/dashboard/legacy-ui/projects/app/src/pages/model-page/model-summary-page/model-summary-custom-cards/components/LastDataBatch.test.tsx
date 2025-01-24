import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import LastDataBatch from './LastDataBatch';

const { getByTestId, getByText, queryByTestId, queryByText } = screen;

describe('<LastDataBatch />', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2022-01-31T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render label', () => {
    getRenderer({ timestamp: 0 });
    expect(getByText(/last profile analyzed:/i)).toBeInTheDocument();
  });

  describe('when is loading', () => {
    it('should render loading state', () => {
      getRenderer({ loading: true, timestamp: 0 });
      expect(getByTestId('loadingSkeleton')).toBeInTheDocument();
    });

    it('should not render data', () => {
      getRenderer({ loading: true, timestamp: 0 });
      expect(queryByText(/no batched data/i)).not.toBeInTheDocument();
    });
  });

  describe('when is not loading', () => {
    it('should not render loading state', () => {
      getRenderer({ loading: false, timestamp: 0 });
      expect(queryByTestId('loadingSkeleton')).not.toBeInTheDocument();
    });

    it('should render "No profiles" when timestamp is 0', () => {
      getRenderer({ timestamp: 0 });
      expect(getByText(/no profiles/i)).toBeInTheDocument();
    });

    it.each([
      ['About 11 years ago', 1292870948000],
      ['About 1 year ago', 1608490148000],
      ['10 days ago', 1642704548000],
      ['About 5 hours ago', 1643568548000],
      ['11 minutes ago', 1643586548000],
      ['Less than a minute ago', 1643587180000],
    ])('should render %p when timestamp is %p', (expected, timestamp) => {
      getRenderer({ timestamp });
      expect(getByText(expected)).toBeInTheDocument();
    });
  });
});

// Helpers
function getRenderer(props: ComponentProps<typeof LastDataBatch>) {
  return render(<LastDataBatch {...props} />);
}
