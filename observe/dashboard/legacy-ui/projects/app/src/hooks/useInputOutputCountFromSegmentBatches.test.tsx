import { renderHook } from '@testing-library/react-hooks';
import { TimePeriod } from 'generated/graphql';
import { FC } from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { RecoilRoot } from 'recoil';
import { MemoryRouter } from 'react-router-dom';
import { mockUseGlobalDateRange } from './mocks/mockUseGlobalDateRange';
import {
  useInputOutputCountFromSegmentBatches,
  UseInputOutputCountFromSegmentBatchesProps,
} from './useInputOutputCountFromSegmentBatches';

describe('useInputOutputCountFromSegmentBatches()', () => {
  beforeEach(() => {
    mockUseGlobalDateRange();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return empty lists when segmentData is empty', () => {
    const { result } = getHookRenderer({ batchFrequency: TimePeriod.P1D, segmentData: [] });

    expect(result.current).toStrictEqual({
      inputData: [],
      outputData: [],
    });
  });

  it('should return correct list when segmentData is not empty', () => {
    const { result } = getHookRenderer({
      batchFrequency: TimePeriod.P1D,
      segmentData: [
        {
          batches: [
            {
              inputCount: 1,
              outputCount: 2,
              timestamp: 1578337678000,
            },
            {
              inputCount: 3,
              outputCount: 4,
              timestamp: 1578492478000,
            },
          ],
        },
      ],
    });

    expect(result.current).toStrictEqual({
      inputData: [
        {
          items: {
            '01/06': {
              date: 1578337678000,
              y: 1,
            },
            '01/07': {
              date: 1578355200000,
              y: 0,
            },
            '01/08': {
              date: 1578492478000,
              y: 3,
            },
            '01/09': {
              date: 1578528000000,
              y: 0,
            },
          },
          total: 4,
        },
      ],
      outputData: [
        {
          items: {
            '01/06': {
              date: 1578337678000,
              y: 2,
            },
            '01/07': {
              date: 1578355200000,
              y: 0,
            },
            '01/08': {
              date: 1578492478000,
              y: 4,
            },
            '01/09': {
              date: 1578528000000,
              y: 0,
            },
          },
          total: 6,
        },
      ],
    });
  });
});

// Helpers
function getHookRenderer(props: UseInputOutputCountFromSegmentBatchesProps) {
  const wrapper: FC = ({ children }) => (
    <MockedProvider>
      <RecoilRoot>
        <MemoryRouter>{children}</MemoryRouter>
      </RecoilRoot>
    </MockedProvider>
  );
  return renderHook(() => useInputOutputCountFromSegmentBatches(props), { wrapper });
}
